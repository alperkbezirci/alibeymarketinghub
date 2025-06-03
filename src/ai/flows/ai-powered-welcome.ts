
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
import { getWeatherForecast, type WeatherInfoOutput } from './weather-forecast-flow'; // Import the new flow

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
  // The prompt input will now include the structured weather data from the WeatherInfoOutputSchema
  input: { schema: WelcomeMessageInputSchema.extend({ weatherData: WeatherInfoOutputSchema.optional() }) },
  output: { schema: WelcomeMessageOutputSchema },
  // No tool needed here directly, as weatherData is passed in.
  prompt: `Sen bir Pazarlama Merkezi uygulamasında kullanıcıları karşılayan, son derece pozitif, esprili ve motive edici bir asistansın.
Kullanıcı Adı: {{userName}}
Tarih: {{date}}
Saat: {{time}}
Kullanıcının Konumu: {{location}}

{{#if weatherData.currentWeather}}
Şu anki Hava Durumu ({{location}}):
Sıcaklık: {{weatherData.currentWeather.temp}}°C (Hissedilen: {{weatherData.currentWeather.feelsLike}}°C)
Durum: {{weatherData.currentWeather.description}}
Nem: {{weatherData.currentWeather.humidity}}%
Rüzgar: {{weatherData.currentWeather.windSpeed}} m/s
{{else}}
Anlık hava durumu bilgisi alınamadı.
{{/if}}

{{#if weatherData.todayHourlyForecast.length}}
Bugünün Saatlik Tahmini:
{{#each weatherData.todayHourlyForecast}}
- {{time}}: {{temp}}°C, {{description}}, Yağış: {{pop}}%
{{/each}}
{{else}}
Bugün için saatlik tahmin detayı bulunmuyor.
{{/if}}

{{#if weatherData.threeDaySummaryForecast.length}}
Önümüzdeki 3 Günün Özeti:
{{#each weatherData.threeDaySummaryForecast}}
- {{date}} ({{dayName}}): En Düşük {{minTemp}}°C, En Yüksek {{maxTemp}}°C, {{description}}, Yağış İhtimali: {{precipitationChance}}%
{{/each}}
{{else}}
Gelecek günler için özet tahmin bilgisi alınamadı.
{{/if}}

{{#if todaysEvents.length}}
Bugünün Takvim Etkinlikleri:
{{#each todaysEvents}}
- {{{this}}}
{{/each}}
{{else}}
Bugün için planlanmış herhangi bir takvim etkinliği bulunmuyor.
{{/if}}

{{#if userProjectsSummary.length}}
Sana Atanmış Projelerin Durumu:
{{#each userProjectsSummary}}
- {{{this}}}
{{/each}}
{{else}}
Şu anda sana atanmış aktif bir proje bulunmuyor.
{{/if}}

Yönergeler:
1.  Kullanıcıyı ismiyle sıcak bir şekilde selamla.
2.  Şu anki hava durumunu ({{weatherData.currentWeather.description}}, {{weatherData.currentWeather.temp}}°C) mesajına doğal bir şekilde dahil et.
3.  **Bugünün saatlik tahminini ({{weatherData.todayHourlyForecast}}) dikkate alarak GÜNLÜK PRATİK TAVSİYELER ver.**
    *   Örneğin, eğer öğleden sonra yağış olasılığı (%{{#first weatherData.todayHourlyForecast}}{{pop}}{{/first}} gibi) yüksekse, "Bugün {{location}} şehrinde hava {{weatherData.currentWeather.description}} ve {{weatherData.currentWeather.temp}}°C civarında. {{#if weatherData.todayHourlyForecast}}{{#each weatherData.todayHourlyForecast}}{{#if (compare pop ">" 50)}}Öğleden sonra {{time}} gibi yağmur %{{pop}} ihtimalle uğrayabilir, şemsiyeni yanında bulundursan iyi olur!{{break}}{{/if}}{{/each}}{{/if}}" gibi bir ifade kullan.
    *   Eğer belirli saatlerde (örn: {{#first weatherData.todayHourlyForecast}}{{time}}{{/first}}) sıcaklık çok artıyorsa (örn: {{#first weatherData.todayHourlyForecast}}{{temp}}{{/first}} > 30), "Saat {{#first weatherData.todayHourlyForecast}}{{time}}{{/first}} civarı sıcaklık {{#first weatherData.todayHourlyForecast}}{{temp}}{{/first}}°C'ye kadar çıkabilir, dışarıdaysan bol su içmeyi ve güneşten korunmayı unutma!" gibi bir uyarı ekle.
    *   Bu tavsiyeleri eğlenceli ve samimi bir dille aktar. Her zaman olmasa da, uygun olduğunda bu tür detaylara gir.
4.  Eğer varsa, bugünün takvim etkinliklerinden kısaca bahset.
5.  Eğer varsa, kullanıcıya atanmış projelerin genel durumuna değin.
6.  Tüm bu bilgileri kullanarak, kullanıcının o günkü durumuna uygun, kişiselleştirilmiş, motive edici ve cesaretlendirici bir mesaj oluştur.
7.  Mesajının sonunda "İyi çalışmalar!", "Harika bir gün geçir!" veya benzeri pozitif bir kapanış yap.
8.  Eğer takvimde etkinlik yoksa veya atanmış proje yoksa, bunu da olumlu bir şekilde ifade et.
9.  Eğer hava durumu verisi alınamazsa (weatherData boş veya error içeriyorsa), bunu nazikçe belirt ve genel bir karşılama yap.
`,
});

const welcomeMessageFlow = ai.defineFlow(
  {
    name: 'enhancedWelcomeMessageFlow',
    inputSchema: WelcomeMessageInputSchema,
    outputSchema: WelcomeMessageOutputSchema,
  },
  async (input): Promise<WelcomeMessageOutput> => {
    let weatherData: WeatherInfoOutput | undefined;
    try {
      weatherData = await getWeatherForecast({ location: input.location });
      if (weatherData.error) {
        console.warn(`Weather data could not be fetched for ${input.location}: ${weatherData.error}`);
        // Proceed without weather data, AI prompt will handle missing data.
      }
    } catch (error: any) {
      console.error(`Error fetching weather data for welcome message for user ${input.userName}: ${error.message}`);
      // Proceed without weather data
    }

    try {
      const {output} = await welcomeMessagePrompt({...input, weatherData });

      if (!output || !output.message) {
        console.warn(`AI welcome message prompt returned null or empty output for user ${input.userName}. Input:`, {...input, weatherData});
        return { message: `Merhaba ${input.userName}, Pazarlama Merkezi'ne hoş geldiniz! Bugün ${input.date}, saat ${input.time}. Harika bir gün geçirmenizi dileriz!` };
      }
      return output;
    } catch (error: any) {
      console.error(
        `Error calling welcomeMessagePrompt for user ${input.userName}. Error: ${error.message}. Input: ${JSON.stringify({...input, weatherData})}. Falling back to default welcome message.`,
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
