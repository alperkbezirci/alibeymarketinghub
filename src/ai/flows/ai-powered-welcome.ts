'use server';

/**
 * @fileOverview An AI-powered welcome message flow.
 *
 * - generateWelcomeMessage - A function that generates a personalized welcome message.
 * - WelcomeMessageInput - The input type for the generateWelcomeMessage function.
 * - WelcomeMessageOutput - The return type for the generateWelcomeMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WelcomeMessageInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
  date: z.string().describe('The current date.'),
  time: z.string().describe('The current time.'),
  pendingTasks: z.number().describe('The number of pending tasks.'),
  pendingProjects: z.number().describe('The number of pending projects.'),
});
export type WelcomeMessageInput = z.infer<typeof WelcomeMessageInputSchema>;

const WelcomeMessageOutputSchema = z.object({
  message: z.string().describe('The personalized welcome message.'),
});
export type WelcomeMessageOutput = z.infer<typeof WelcomeMessageOutputSchema>;

export async function generateWelcomeMessage(input: WelcomeMessageInput): Promise<WelcomeMessageOutput> {
  return welcomeMessageFlow(input);
}

const welcomeMessagePrompt = ai.definePrompt({
  name: 'welcomeMessagePrompt',
  input: {schema: WelcomeMessageInputSchema},
  output: {schema: WelcomeMessageOutputSchema},
  prompt: `Merhaba {{userName}}, bugün {{date}} ve saat şu anda {{time}}.\n\n{{pendingTasks}} adet tamamlanmamış göreviniz ve {{pendingProjects}} adet tamamlanmamış projeniz bulunmaktadır. Gününüze güzel bir başlangıç yapın! `,
});

const welcomeMessageFlow = ai.defineFlow(
  {
    name: 'welcomeMessageFlow',
    inputSchema: WelcomeMessageInputSchema,
    outputSchema: WelcomeMessageOutputSchema,
  },
  async input => {
    const {output} = await welcomeMessagePrompt(input);
    return output!;
  }
);
