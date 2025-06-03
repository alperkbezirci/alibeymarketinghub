
'use server';

/**
 * @fileOverview An AI-powered welcome message flow that incorporates location,
 * weather (via a tool), today's calendar events, and user's project overview
 * to generate a personalized and motivational message.
 *
 * - generateWelcomeMessage - A function that generates a personalized welcome message.
 * - WelcomeMessageInput - The input type for the generateWelcomeMessage function.
 * - WelcomeMessageOutput - The return type for the generateWelcomeMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Tool to get weather information (simulated)
const getWeatherTool = ai.defineTool(
  {
    name: 'getWeatherForLocation',
    description: 'Belirtilen bir konum için mevcut hava durumu bilgisini alır.',
    inputSchema: z.object({ location: z.string().describe('Hava durumu bilgisi alınacak şehir ve ülke, örn: Antalya, Türkiye') }),
    outputSchema: z.object({ weatherSummary: z.string().describe('Konum için özet hava durumu, örn: Güneşli, 28°C') }),
  },
  async ({location}) => {
    // In a real application, this would call an external weather API.
    // For simulation, we return a mock response.
    let mockWeather = "Güneşli ve 28°C";
    if (location.toLowerCase().includes("ankara")) mockWeather = "Parçalı bulutlu ve 22°C";
    else if (location.toLowerCase().includes("istanbul")) mockWeather = "Yağmurlu ve 20°C";
    return { weatherSummary: `${location} için hava durumu: ${mockWeather}.` };
  }
);

const WelcomeMessageInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
  date: z.string().describe('The current date.'),
  time: z.string().describe('The current time.'),
  location: z.string().describe('User\'s current location, e.g., Antalya, Türkiye.'),
  todaysEvents: z.array(z.string()).describe('A list of today\'s scheduled calendar event titles or summaries. Empty if no events.'),
  userProjectsSummary: z.array(z.string()).describe('A list of summaries for projects assigned to the user, e.g., ["Proje X (Devam Ediyor)", "Proje Y (Tamamlandı)"]. Empty if no projects.'),
});
export type WelcomeMessageInput = z.infer<typeof WelcomeMessageInputSchema>;

const WelcomeMessageOutputSchema = z.object({
  message: z.string().describe('The personalized and motivational welcome message.'),
});
export type WelcomeMessageOutput = z.infer<typeof WelcomeMessageOutputSchema>;

export async function generateWelcomeMessage(input: WelcomeMessageInput): Promise<WelcomeMessageOutput> {
  return welcomeMessageFlow(input);
}

const welcomeMessagePrompt = ai.definePrompt({
  name: 'enhancedWelcomeMessagePrompt',
  input: { schema: WelcomeMessageInputSchema }, // Input schema for the prompt itself, not the flow
  output: { schema: WelcomeMessageOutputSchema },
  tools: [getWeatherTool],
  prompt: `Sen bir Pazarlama Merkezi uygulamasında kullanıcıları karşılayan, son derece pozitif ve motive edici bir asistansın.
Kullanıcı Adı: {{userName}}
Tarih: {{date}}
Saat: {{time}}
Kullanıcının Konumu: {{location}}
{{#if todaysEvents}}
Bugünün Takvim Etkinlikleri:
{{#each todaysEvents}}
- {{{this}}}
{{/each}}
{{else}}
Bugün için planlanmış herhangi bir takvim etkinliği bulunmuyor.
{{/if}}

{{#if userProjectsSummary}}
Sana Atanmış Projelerin Durumu:
{{#each userProjectsSummary}}
- {{{this}}}
{{/each}}
{{else}}
Şu anda sana atanmış aktif bir proje bulunmuyor.
{{/if}}

Yönergeler:
1.  Kullanıcıyı ismiyle sıcak bir şekilde selamla.
2.  'getWeatherForLocation' aracını kullanarak kullanıcının konumu ({{location}}) için hava durumu bilgisini al ve mesajına doğal bir şekilde dahil et. Hava durumunu belirterek güne başla.
3.  Eğer varsa, bugünün takvim etkinliklerinden kısaca bahset.
4.  Eğer varsa, kullanıcıya atanmış projelerin genel durumuna değin.
5.  Tüm bu bilgileri (hava durumu, takvim, projeler) kullanarak, kullanıcının o günkü durumuna (yoğun bir gün mü, proje odaklı mı, yeni başlangıçlar için mi vb.) uygun, kişiselleştirilmiş, motive edici ve cesaretlendirici bir mesaj oluştur. Mesajın samimi ve destekleyici olmalı. Kullanıcıyı güne pozitif başlatmayı hedefle.
6.  Mesajının sonunda "İyi çalışmalar!" veya "Harika bir gün geçir!" gibi pozitif bir kapanış yap.
7.  Eğer takvimde etkinlik yoksa veya atanmış proje yoksa, bunu da olumlu bir şekilde ifade et (örn: "Bugün takvimin sakin görünüyor, belki yeni planlar yapmak için harika bir zaman!" veya "Proje listen şu an için boş, yeni fırsatlara odaklanabilirsin!").
8.  Hava durumu bilgisini aldıktan sonra, mesajına "Bugün {{location}} şehrinde hava {{weatherSummary}}..." gibi bir ifadeyle başla.
`,
});

const welcomeMessageFlow = ai.defineFlow(
  {
    name: 'enhancedWelcomeMessageFlow',
    inputSchema: WelcomeMessageInputSchema,
    outputSchema: WelcomeMessageOutputSchema,
  },
  async (input): Promise<WelcomeMessageOutput> => {
    try {
      // The prompt will automatically use the getWeatherTool if it deems necessary based on instructions.
      // The prompt itself receives the full input including location.
      const {output} = await welcomeMessagePrompt(input);

      if (!output || !output.message) {
        console.warn(`AI welcome message prompt returned null or empty output for user ${input.userName}. Input:`, input);
        return { message: `Merhaba ${input.userName}, Pazarlama Merkezi'ne hoş geldiniz! Bugün ${input.date}, saat ${input.time}. Harika bir gün geçirmenizi dileriz!` };
      }
      return output;
    } catch (error: any) {
      console.error(
        `Error calling welcomeMessagePrompt for user ${input.userName}. Error: ${error.message}. Input: ${JSON.stringify(input)}. Falling back to default welcome message.`,
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
      
      let fallbackMessage = `Merhaba ${input.userName}, Pazarlama Merkezi'ne hoş geldiniz!`;
      if (input.date && input.time) {
        fallbackMessage = `Merhaba ${input.userName}, Pazarlama Merkezi'ne hoş geldiniz! Bugün ${input.date}, saat ${input.time}. Sistemimiz şu anda size özel bir mesaj üretemiyor, ancak harika bir gün geçirmenizi dileriz!`;
      }
      return { message: fallbackMessage };
    }
  }
);
