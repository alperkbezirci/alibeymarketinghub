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
  description: z.string().describe('The generated project description.'),
});
export type GenerateDescriptionOutput = z.infer<typeof GenerateDescriptionOutputSchema>;

export async function generateDescription(input: GenerateDescriptionInput): Promise<GenerateDescriptionOutput> {
  return generateDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDescriptionPrompt',
  input: {schema: GenerateDescriptionInputSchema},
  output: {schema: GenerateDescriptionOutputSchema},
  prompt: `You are an expert marketing assistant. Generate a project description based on the following details: {{{details}}}`,
});

const generateDescriptionFlow = ai.defineFlow(
  {
    name: 'generateDescriptionFlow',
    inputSchema: GenerateDescriptionInputSchema,
    outputSchema: GenerateDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
