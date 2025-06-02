
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
  async (input): Promise<WelcomeMessageOutput> => {
    try {
      const {output} = await welcomeMessagePrompt(input);
      if (!output) {
        console.warn(`AI welcome message prompt returned null output for user ${input.userName}. Input:`, input);
        // Provide a basic fallback if output is unexpectedly null
        return { message: `Merhaba ${input.userName}, hoş geldiniz! Kontrol panelinize genel bir bakış.` };
      }
      return output;
    } catch (error: any) {
      console.error(
        `Error calling welcomeMessagePrompt for user ${input.userName}. Error: ${error.message}. Falling back to default welcome message.`,
        // To log the full error details if necessary for debugging, you can uncomment the next line:
        // JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
      
      // Construct a user-friendly fallback message
      let fallbackMessage = `Merhaba ${input.userName}, hoş geldiniz!`;
      if (input.date && input.time) {
        fallbackMessage = `Merhaba ${input.userName}, hoş geldiniz! Bugün ${input.date}, saat ${input.time}. Sistemimiz şu anda size özel bir karşılama mesajı üretemiyor, ancak harika bir gün geçirmenizi dileriz!`;
      } else {
        fallbackMessage = `Merhaba ${input.userName}, hoş geldiniz! Sistemimiz şu anda size özel bir karşılama mesajı üretemiyor, ancak harika bir gün geçirmenizi dileriz!`;
      }
      
      // Ensure the fallback conforms to WelcomeMessageOutputSchema
      return { message: fallbackMessage };
    }
  }
);
