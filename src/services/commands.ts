import { db } from '../db';
import { workouts, sets } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { parserWorkoutMessage } from './parser';
import { analyzeEvolution } from './analyzer';
import { getOnboardingStep, handleOnboarding } from './onboarding';

export interface CommandResult {
    response: string;
    success: boolean;
}

export async function processMessage(userId: string, message: string): Promise<CommandResult> {
  const trimmed = message.trim();

  // Checkar onboarding
  const onboardingStep = await getOnboardingStep(userId);
  if (onboardingStep !== 'complete') {
    const result = await handleOnboarding(userId, trimmed);
    return { success: true, response: result.response };
  }

  if (trimmed.startsWith('/')) {
    return handleCommand(userId, trimmed);
  }

  return handleWorkoutRegistration(userId, trimmed);
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
        return { success: false, response: '/historico <exercício>' };
      }
      return getExerciseHistory(userId, exerciseName);
    }

    default:
      return { success: false, response: `Comando desconhecido: ${command}` };
  }
}

async function handleWorkoutRegistration(userId: string, message: string): Promise<CommandResult> {
  const parseResult = await parserWorkoutMessage(message);

  if (!parseResult.success) {
    return {
      success: false,
      response: `❌ Não consegui entender o treino.\n\n${parseResult.errors.join('\n')}`,
    };
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const [workout] = await db
      .insert(workouts)
      .values({ userId, date: today })
      .returning();

    const setsToInsert = parseResult.exercises.map((ex, idx) => ({
      workoutId: workout.id,
      exercise: ex.exercise,
      exerciseRaw: ex.exerciseRaw,
      setsCount: ex.setsCount,
      reps: ex.reps,
      weight: ex.weightKg?.toString() || null,
      orderIndex: idx,
    }));

    await db.insert(sets).values(setsToInsert);

    const list = parseResult.exercises
      .map(e => {
        const weight = e.weightKg ? ` ${e.weightKg}kg` : '';
        return `• ${e.exerciseRaw}: ${e.setsCount}x${e.reps}${weight}`;
      })
      .join('\n');

    // Análise de evolução
    const evolution = await analyzeEvolution(userId, parseResult.exercises);

    return {
      success: true,
      response: `✅ *Treino registrado!*\n\n${list}\n\n📊 *Evolução:*\n${evolution}`,
    };
  } catch (err) {
    console.error('Erro ao salvar treino:', err);
    return { success: false, response: '❌ Erro ao salvar treino' };
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
    return { success: false, response: 'Erro ao buscar último treino' };
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
    return { success: false, response: 'Erro ao buscar histórico' };
  }
}