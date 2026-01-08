import { db } from '../db';
import { workouts, sets } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { handleConversation } from './conversation';

export interface CommandResult {
    response: string;
    success: boolean;
}

export async function processMessage(userId: string, message: string): Promise<CommandResult> {
  const trimmed = message.trim();

  // Comandos específicos começam com /
  if (trimmed.startsWith('/')) {
    return handleCommand(userId, trimmed);
  }

  // Tudo mais vai para conversa livre com IA
  try {
    const response = await handleConversation(userId, trimmed);
    return { success: true, response };
  } catch (err) {
    console.error('Erro no processamento:', err);
    return { success: true, response: '❌ Não foi possível processar sua solicitação' };
  }
}

async function handleCommand(userId: string, message: string): Promise<CommandResult> {
    const [command, ...args] = message.toLowerCase().split(' ');

  switch (command) {
    case '/help':
      return {
        success: true,
        response: `📋 *Comandos:*\n/help - Este menu\n/ultimo - Último treino\n/historico <exercício> - Histórico`,
      };

    case '/ultimo':
      return getLastWorkout(userId);

    case '/historico': {
      const exerciseName = args.join(' ');
      if (!exerciseName) {
        return { success: true, response: '❌ Não foi possível processar sua solicitação' };
      }
      return getExerciseHistory(userId, exerciseName);
    }

    default:
      return { success: true, response: '❌ Não foi possível processar sua solicitação' };
  }
}

async function getLastWorkout(userId: string): Promise<CommandResult> {
  try {
    const lastWorkout = await db
      .select()
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.date))
      .limit(1)
      .then(rows => rows[0]);

    if (!lastWorkout) {
      return { success: true, response: '📭 Nenhum treino registrado' };
    }

    const workoutSets = await db
      .select()
      .from(sets)
      .where(eq(sets.workoutId, lastWorkout.id));

    const list = workoutSets
      .map(s => {
        const weight = s.weight ? ` ${s.weight}kg` : '';
        return `• ${s.exerciseRaw}: ${s.setsCount}x${s.reps}${weight}`;
      })
      .join('\n');

    return {
      success: true,
      response: `🏋️ *Último treino (${lastWorkout.date}):*\n\n${list}`,
    };
  } catch (err) {
    console.error('Erro ao buscar último treino:', err);
    return { success: true, response: '❌ Não foi possível processar sua solicitação' };
  }
}

async function getExerciseHistory(userId: string, exerciseName: string): Promise<CommandResult> {
  try {
    const history = await db
      .select()
      .from(sets)
      .where(eq(sets.exercise, exerciseName.toLowerCase()))
      .orderBy(desc(sets.createdAt))
      .limit(5);

    if (history.length === 0) {
      return { success: true, response: `📭 Nenhum registro de "${exerciseName}"` };
    }

    const list = history
      .map(s => {
        const weight = s.weight ? ` ${s.weight}kg` : '';
        return `• ${s.setsCount}x${s.reps}${weight}`;
      })
      .join('\n');

    return {
      success: true,
      response: `📊 *Histórico: ${exerciseName}*\n\n${list}`,
    };
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    return { success: true, response: '❌ Não foi possível processar sua solicitação' };
  }
}