import { config } from 'dotenv';
import { z } from 'zod';
import Groq from 'groq-sdk';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export async function askAI(prompt: string): Promise<string> {
  const message = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textContent = message.choices[0]?.message?.content;
  if (!textContent) {
    throw new Error('Sem resposta de texto da IA');
  }

  return textContent;
}

