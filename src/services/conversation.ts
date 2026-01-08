import { db } from '../db';
import { users, workouts, sets, messages } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { askAI } from './ai';
import fs from 'fs';
import path from 'path';

// Carrega prompt do sistema uma única vez
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'system.md'),
  'utf-8'
);

export async function handleConversation(userId: string, userMessage: string): Promise<string> {
  // Buscar usuário
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then(rows => rows[0]);

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  // Buscar últimas 5 mensagens para contexto de conversa
  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.userId, userId))
    .orderBy(desc(messages.receivedAt))
    .limit(5);

  // Buscar últimos 3 treinos completos com exercícios
  const recentWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date))
    .limit(3);

  // Buscar sets dos últimos treinos
  const workoutIds = recentWorkouts.map(w => w.id);
  let workoutSets: any[] = [];
  if (workoutIds.length > 0) {
    workoutSets = await db
      .select()
      .from(sets)
      .where(eq(sets.workoutId, workoutIds[0]))
      .orderBy(sets.orderIndex);
  }

  // Montar contexto do perfil do usuário
  const hasProfile = user.weight && user.height;
  const profileContext = hasProfile
    ? `**PERFIL JÁ CADASTRADO:**
- Peso: ${user.weight}kg
- Altura: ${user.height}cm
- Objetivo: ${user.objective || 'ainda não definido'}
- Rotina: ${user.weeklyRoutine ? JSON.stringify(user.weeklyRoutine) : 'ainda não definida'}`
    : `**PERFIL AINDA NÃO CADASTRADO** - pergunte peso e altura`;

  // Montar histórico de conversas
  const conversationHistory = recentMessages
    .reverse()
    .map(msg => `Usuário: ${msg.body}`)
    .join('\n');

  // Montar histórico de treinos
  const workoutsHistory = recentWorkouts.length > 0
    ? recentWorkouts.map(w => {
        const date = new Date(w.date).toLocaleDateString('pt-BR');
        return `${date}: ${w.notes || 'treino registrado'}`;
      }).join('\n')
    : 'Nenhum treino registrado ainda';

  // Montar prompt completo
  const fullPrompt = `${SYSTEM_PROMPT}

---

## CONTEXTO ATUAL

${profileContext}

### Últimas 5 mensagens:
${conversationHistory || 'Primeira conversa'}

### Últimos 3 treinos:
${workoutsHistory}

---

**Mensagem atual do usuário:** "${userMessage}"

**Sua resposta:**`;

  try {
    const aiResponse = await askAI(fullPrompt);
    console.log('🤖 Resposta IA completa:', aiResponse);

    // Processar resposta e extrair dados para salvar
    await processAIResponse(userId, aiResponse);

    // Remover marcadores da resposta final
    const cleanResponse = aiResponse
      .replace(/\[SAVE_PROFILE\].*?\[\/SAVE_PROFILE\]/g, '')
      .replace(/\[SAVE_WORKOUT\].*?\[\/SAVE_WORKOUT\]/g, '')
      .replace(/\[SAVE_OBJECTIVE\].*?\[\/SAVE_OBJECTIVE\]/g, '')
      .replace(/\[SAVE_ROUTINE\].*?\[\/SAVE_ROUTINE\]/g, '')
      .trim();

    return cleanResponse || '👍 Entendi!';
  } catch (err) {
    console.error('Erro na conversa:', err);
    return '❌ Não foi possível processar sua solicitação';
  }
}

async function processAIResponse(userId: string, aiResponse: string) {
  // Extrair e salvar perfil (peso/altura)
  const profileMatch = aiResponse.match(/\[SAVE_PROFILE\](.*?)\[\/SAVE_PROFILE\]/);
  if (profileMatch) {
    try {
      const data = JSON.parse(profileMatch[1]);
      await db
        .update(users)
        .set({
          weight: data.weight?.toString(),
          height: data.height?.toString(),
        })
        .where(eq(users.id, userId));
      console.log('✅ Perfil salvo:', data);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    }
  }

  // Extrair e salvar objetivo
  const objectiveMatch = aiResponse.match(/\[SAVE_OBJECTIVE\](.*?)\[\/SAVE_OBJECTIVE\]/);
  if (objectiveMatch) {
    await db
      .update(users)
      .set({ objective: objectiveMatch[1].trim(), onboardingComplete: 'true' })
      .where(eq(users.id, userId));
    console.log('✅ Objetivo salvo:', objectiveMatch[1]);
  }

  // Extrair e salvar rotina
  const routineMatch = aiResponse.match(/\[SAVE_ROUTINE\](.*?)\[\/SAVE_ROUTINE\]/);
  if (routineMatch) {
    try {
      const routine = JSON.parse(routineMatch[1]);
      await db
        .update(users)
        .set({ weeklyRoutine: routine })
        .where(eq(users.id, userId));
      console.log('✅ Rotina salva:', routine);
    } catch (err) {
      console.error('Erro ao salvar rotina:', err);
    }
  }

  // Extrair e salvar treino
  const workoutMatch = aiResponse.match(/\[SAVE_WORKOUT\](.*?)\[\/SAVE_WORKOUT\]/);
  if (workoutMatch) {
    try {
      const exercises = JSON.parse(workoutMatch[1]);
      const today = new Date().toISOString().split('T')[0];

      const [workout] = await db
        .insert(workouts)
        .values({ userId, date: today })
        .returning();

      const setsToInsert = exercises.map((ex: any, idx: number) => ({
        workoutId: workout.id,
        exercise: ex.exercise.toLowerCase(),
        exerciseRaw: ex.exercise,
        setsCount: ex.sets,
        reps: ex.reps,
        weight: ex.weight?.toString() || null,
        orderIndex: idx,
      }));

      await db.insert(sets).values(setsToInsert);
      console.log('✅ Treino salvo:', exercises);
    } catch (err) {
      console.error('Erro ao salvar treino:', err);
    }
  }
}
