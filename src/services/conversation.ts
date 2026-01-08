import { db } from '../db';
import { users, workouts, sets } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { askAI } from './ai';

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

  // Buscar últimas mensagens para contexto
  const recentWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date))
    .limit(3);

  // Montar contexto do usuário
  const userContext = `
Perfil do usuário:
- Peso: ${user.weight || 'não informado'}
- Altura: ${user.height || 'não informado'}
- Objetivo: ${user.objective || 'não informado'}
- Rotina semanal: ${user.weeklyRoutine ? JSON.stringify(user.weeklyRoutine) : 'não informada'}
- Últimos treinos: ${recentWorkouts.length} registrados
`;

  // Prompt para IA conversacional
  const prompt = `Você é um assistente pessoal de treinos. Converse naturalmente em português do Brasil.

${userContext}

INSTRUÇÕES:
1. Se o usuário fornecer peso/altura, extraia e retorne no formato: [SAVE_PROFILE]{"weight": X, "height": Y}[/SAVE_PROFILE]
2. Se o usuário enviar um treino (ex: "fiz supino 3x10 60kg"), extraia e retorne no formato: [SAVE_WORKOUT][{"exercise": "supino", "sets": 3, "reps": 10, "weight": 60}][/SAVE_WORKOUT]
3. Se o usuário informar objetivo, extraia: [SAVE_OBJECTIVE]texto do objetivo[/SAVE_OBJECTIVE]
4. Se o usuário informar rotina semanal, extraia: [SAVE_ROUTINE]{"monday": "peito", ...}[/SAVE_ROUTINE]
5. Sempre responda de forma amigável e natural
6. Após extrair dados, confirme e incentive

Mensagem do usuário: "${userMessage}"

Responda conversacionalmente e inclua os marcadores de dados quando identificar informações.`;

  try {
    const aiResponse = await askAI(prompt);
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
