import { db } from '../db';
import { sets } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { askAI } from './ai';
import { Exercise } from './parser';

export async function analyzeEvolution(userId: string, exercises: Exercise[]): Promise<string> {
  const comments: string[] = [];

  for (const exercise of exercises) {
    const history = await db
      .select()
      .from(sets)
      .where(eq(sets.exercise, exercise.exercise))
      .orderBy(desc(sets.createdAt))
      .limit(5);

    if (history.length === 0) {
      comments.push(`🆕 ${exercise.exerciseRaw}: Primeiro registro!`);
      continue;
    }

    // Preparar dados para IA
    const historyData = history
      .map(s => `${s.setsCount}x${s.reps} ${s.weight || 0}kg`)
      .join(' → ');

    const currentData = `${exercise.setsCount}x${exercise.reps} ${exercise.weightKg || 0}kg`;

    const prompt = `Analise brevemente (1 linha) a evolução deste exercício.

Histórico (antigo → novo): ${historyData}
Hoje: ${currentData}

Responda com emoji + comentário conciso. Ex: "📈 +5kg de evolução!" ou "💪 Mantendo a base"`;

    try {
      const analysis = await askAI(prompt);
      comments.push(`${exercise.exerciseRaw}: ${analysis}`);
    } catch (err) {
      console.error(`Sem análise disponível ${exercise.exerciseRaw}:`, err);
      comments.push(`${exercise.exerciseRaw}: Sem análise disponível`);
    }
  }

  return comments.join('\n');
}