
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
  // Output schema is not directly used by prompt for structuring, but flow will adhere to it.
  // The prompt itself returns a string, which we'll map to GenerateDescriptionOutputSchema in the flow.
  prompt: `You are an expert marketing assistant. Generate a project description based on the following details: {{{details}}}`,
});

const generateDescriptionFlow = ai.defineFlow(
  {
    name: 'generateDescriptionFlow',
    inputSchema: GenerateDescriptionInputSchema,
    outputSchema: GenerateDescriptionOutputSchema,
  },
  async (input): Promise<GenerateDescriptionOutput> => {
    try {
      const {output: modelOutput} = await prompt(input);
      // The prompt directly returns the model's text output based on the simple string prompt.
      // We need to ensure the output matches the string format we expect.
      // If the prompt was configured for structured output (JSON), this would be different.
      if (modelOutput && typeof modelOutput.description === 'string') {
        return { description: modelOutput.description };
      } else if (modelOutput && typeof modelOutput === 'string') { // Fallback if prompt outputs raw string
        return { description: modelOutput };
      }
      // If the output is not as expected, or empty, treat as an error.
      console.warn("AI description generation returned unexpected or empty output:", modelOutput);
      return { error: "Yapay zeka beklenmedik bir formatta yanıt verdi veya boş yanıt döndü." };

    } catch (err: Error) {
      console.error("Error calling generateDescriptionPrompt:", err);
      if (err.message && err.message.includes('503 Service Unavailable')) {
        return { error: "Yapay zeka modeli şu anda aşırı yüklenmiş durumda. Lütfen daha sonra tekrar deneyin." };
      }
      return { error: "Yapay zeka destekli açıklama oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin veya açıklamayı manuel olarak girin." };
    }
  }
);
