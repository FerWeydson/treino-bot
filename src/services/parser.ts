import z from "zod";
import {askAI} from "./ai";

export const exerciseSchema = z.object({
    exercise: z.string().describe("Nome do exercício normalizado (lowercase)"),
    exerciseRaw: z.string().describe("Nome do exercício como enviado"),
    setsCount: z.number().int().positive().describe("Número de séries"),
    reps: z.number().int().positive().describe("Número de repetições por série"),
    weightKg: z.number().positive().describe("Peso em kg utilizado"),
});

export type Exercise = z.infer<typeof exerciseSchema>;

export interface ParseResult {
    success: boolean;
    exercises: Exercise[];
    errors: string[];
}

export async function parserWorkoutMessage(message: string): Promise<ParseResult> {
    const prompt = `Extraia os exercícios desta mensagem de treino em linguagem natural. 
                    Retorne um JSON com array de objetos contendo: exercise (nome normalizado em lowercase), exerciseRaw (nome original), setsCount (número), reps (número), weight (número ou null).

                    Exemplos:
                    - "Fiz supino 3 séries de 10 com 60kg" → [{exercise: "supino", exerciseRaw: "supino", setsCount: 3, reps: 10, weight: 60}]
                    - "3x10 agachamento 80kg" → [{exercise: "agachamento", exerciseRaw: "agachamento", setsCount: 3, reps: 10, weight: 80}]
                    - "Prancha 3x60s" → [{exercise: "prancha", exerciseRaw: "prancha", setsCount: 3, reps: 60, weight: null}]
                    Mensagem: "${message}"
                    Retorne APENAS o JSON, sem explicações.`;

    try {
        const response = await askAI(prompt);
        const parsed = JSON.parse(response);

        if(!Array.isArray(parsed)){
            return { success: false, exercises: [], errors: ['Groq respondeu em um formato inválido'] };
        }

        const exercises: Exercise[] = [];
        const errors: string[] = [];

        for (const item of parsed){
            try{
                const validated = exerciseSchema.parse(item);
                exercises.push(validated);
            }catch (err) {
                errors.push(`Exercício inválido: ${JSON.stringify(item)} - ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        return {
            success: exercises.length > 0,
            exercises,
            errors,
        };
    }catch(err){
        return { success: false, exercises: [], errors: [err instanceof Error ? err.message : String(err)] };
    }
}

