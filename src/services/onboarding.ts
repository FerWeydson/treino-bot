import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { askAI } from './ai';

type OnboardingStep = 'initial' | 'weight_height' | 'routine' | 'objective' | 'complete';

export async function getOnboardingStep(userId: string): Promise<OnboardingStep> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then(rows => rows[0]);

  if (!user) return 'initial';
  if (user.onboardingComplete === 'true') return 'complete';
  if (!user.weight || !user.height) return 'weight_height';
  if (!user.weeklyRoutine) return 'routine';
  if (!user.objective) return 'objective';

  return 'complete';
}

export async function handleOnboarding(userId: string, userMessage: string): Promise<{ response: string; step: OnboardingStep }> {
  const step = await getOnboardingStep(userId);

  switch (step) {
    case 'initial':
      await db.update(users).set({ onboardingComplete: 'false' }).where(eq(users.id, userId));
      return {
        response: `Ótimo! Vou te ajudar a rastrear seus treinos! 💪\n\nPrimeiro, qual seu peso (kg) e altura (cm)? Ex: "75kg 180cm"`,
        step: 'weight_height',
      };

    case 'weight_height': {
      const prompt = `Extraia peso (kg) e altura (cm) desta mensagem: "${userMessage}"\nRetorne JSON: {"weight": número, "height": número}\nSe não conseguir extrair, retorne {"weight": null, "height": null}`;
      const response = await askAI(prompt);
      const parsed = JSON.parse(response);

      if (parsed.weight && parsed.height) {
        await db
          .update(users)
          .set({ weight: parsed.weight.toString(), height: parsed.height.toString() })
          .where(eq(users.id, userId));

        return {
          response: `✅ ${parsed.weight}kg, ${parsed.height}cm registrado!\n\nAgora, qual treino você faz cada dia? Ex: "seg: peito, ter: costas, qua: perna..."`,
          step: 'routine',
        };
      }

      return {
        response: `❌ Não consegui extrair peso e altura. Tenta de novo: "75kg 180cm"`,
        step: 'weight_height',
      };
    }

    case 'routine': {
      const prompt = `Extraia os dias da semana e exercícios desta mensagem: "${userMessage}"\nRetorne JSON objeto: {"monday": "peito", "tuesday": "costas", ...} ou {} se não conseguir`;
      const response = await askAI(prompt);
      const routine = JSON.parse(response);

      if (Object.keys(routine).length > 0) {
        await db
          .update(users)
          .set({ weeklyRoutine: routine })
          .where(eq(users.id, userId));

        return {
          response: `✅ Rotina salva!\n\nPor fim, qual seu objetivo? Ex: "hipertrofia", "força", "emagrecer"`,
          step: 'objective',
        };
      }

      return {
        response: `❌ Não consegui extrair os dias. Tenta assim: "seg: peito, ter: costas"`,
        step: 'routine',
      };
    }

    case 'objective': {
      await db
        .update(users)
        .set({ objective: userMessage, onboardingComplete: 'true' })
        .where(eq(users.id, userId));

      return {
        response: `🎯 Perfeito! Seu objetivo é "${userMessage}".\n\nAgora você está pronto! Envie seus treinos e vou acompanhar sua evolução. 💪`,
        step: 'complete',
      };
    }

    case 'complete':
      return {
        response: `Você já completou o onboarding. Envie um treino ou use /help`,
        step: 'complete',
      };
  }
}