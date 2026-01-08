import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { askAI } from './ai';
import { z } from 'zod';

type OnboardingStep = 'initial' | 'weight_height' | 'routine' | 'objective' | 'complete';

function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start === -1 || end === -1) {
    throw new Error('Nenhum JSON encontrado na resposta');
  }
  
  return text.substring(start, end + 1);
}

const weightHeightSchema = z.object({
  weight: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
});

const routineSchema = z.record(z.string());

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
      // Validar se mensagem contém números antes de chamar IA
      if (!/\d/.test(userMessage)) {
        return {
          response: `❌ Não foi possível processar sua solicitação`,
          step: 'weight_height',
        };
      }

      const prompt = `Extraia peso (kg) e altura (cm) desta mensagem: "${userMessage}"\nRetorne APENAS JSON válido: {"weight": número, "height": número}\nEx: {"weight": 75, "height": 180}`;
      
      try {
        const response = await askAI(prompt);
        console.log('🤖 Resposta IA (weight_height):', response);
        
        const jsonStr = extractJSON(response);
        const data = weightHeightSchema.parse(JSON.parse(jsonStr));

        await db
          .update(users)
          .set({ weight: data.weight.toString(), height: data.height.toString() })
          .where(eq(users.id, userId));

        return {
          response: `✅ ${data.weight}kg, ${data.height}cm registrado!\n\nAgora, qual treino você faz cada dia? Ex: "seg: peito, ter: costas, qua: perna..."`,
          step: 'routine',
        };
      } catch (err) {
        console.error('Erro ao parsear weight_height:', err);
        return {
          response: `❌ Não foi possível processar sua solicitação`,
          step: 'weight_height',
        };
      }
    }

    case 'routine': {
      const prompt = `Extraia os dias da semana e exercícios desta mensagem: "${userMessage}"\nRetorne APENAS JSON válido com os dias em inglês (monday, tuesday, etc): {"monday": "peito", "tuesday": "costas"}\nSe não conseguir, retorne {}`;
      
      try {
        const response = await askAI(prompt);
        console.log('🤖 Resposta IA (routine):', response);
        
        const jsonStr = extractJSON(response);
        const routine = routineSchema.parse(JSON.parse(jsonStr));

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
      } catch (err) {
        console.error('Erro ao parsear routine:', err);
        return {
          response: `❌ Não foi possível processar sua solicitação`,
          step: 'routine',
        };
      }

      return {
        response: `❌ Não foi possível processar sua solicitação`,
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