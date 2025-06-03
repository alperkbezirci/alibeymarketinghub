
'use server';

/**
 * @fileOverview A flow for generating AI-assisted project descriptions.
 *
 * - generateDescription - A function that generates a project description using AI.
 * - GenerateDescriptionInput - The input type for the generateDescription function.
 * - GenerateDescriptionOutput - The return type for the generateDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDescriptionInputSchema = z.object({
  details: z.string().describe('The details of the project.'),
});
export type GenerateDescriptionInput = z.infer<typeof GenerateDescriptionInputSchema>;

const GenerateDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated project description.').optional(),
  error: z.string().describe('An error message if generation failed.').optional(),
});
export type GenerateDescriptionOutput = z.infer<typeof GenerateDescriptionOutputSchema>;

export async function generateDescription(input: GenerateDescriptionInput): Promise<GenerateDescriptionOutput> {
  return generateDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDescriptionPrompt',
  input: {schema: GenerateDescriptionInputSchema},
  output: {schema: GenerateDescriptionOutputSchema}, // Instruct Genkit to expect output matching this schema
  prompt: `You are an expert marketing assistant. Based on the following project details, generate a compelling project description.
Project Details:
{{{details}}}

Ensure your response is a JSON object that conforms to the provided output schema, specifically providing the generated description in the "description" field.`,
});

const generateDescriptionFlow = ai.defineFlow(
  {
    name: 'generateDescriptionFlow',
    inputSchema: GenerateDescriptionInputSchema,
    outputSchema: GenerateDescriptionOutputSchema,
  },
  async (input): Promise<GenerateDescriptionOutput> => {
    try {
      const response = await prompt(input); // Genkit will attempt to parse the LLM output as JSON
      const modelOutput = response.output;   // modelOutput is now of type GenerateDescriptionOutputSchema | undefined

      if (modelOutput && typeof modelOutput.description === 'string' && modelOutput.description.trim() !== '') {
        return { description: modelOutput.description };
      }
      
      console.warn("AI description generation returned no description or unexpected output. Raw output:", response.raw?.choices[0]?.message?.content);
      return { error: "Yapay zeka geçerli bir proje açıklaması üretemedi veya açıklama alanı boştu." };

    } catch (err: any) {
      console.error("Error calling generateDescriptionPrompt:", err);
      if (err.message && err.message.includes('503 Service Unavailable')) {
        return { error: "Yapay zeka modeli şu anda aşırı yüklenmiş durumda. Lütfen daha sonra tekrar deneyin." };
      }
      if (err.message && err.message.includes('JSON')) {
        return { error: "Yapay zeka modelinden gelen yanıt JSON formatında değildi. Lütfen tekrar deneyin." };
      }
      return { error: "Yapay zeka destekli açıklama oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin veya açıklamayı manuel olarak girin." };
    }
  }
);
