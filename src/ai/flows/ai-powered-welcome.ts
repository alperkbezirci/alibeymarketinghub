
'use server';

/**
 * @fileOverview An AI-powered welcome message flow that incorporates location,
 * weather (via a separate flow), today's calendar events, and user's project overview
 * to generate a personalized and motivational message.
 * This file is marked with 'use server' and should only export async functions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getWeatherForecast } from './weather-forecast-flow'; // Import the async function
import { WeatherInfoOutputSchema, type WeatherInfoOutput } from '@/ai/schemas/weather-schemas'; // Import schema and type from the new location

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

// Define the prompt using the imported WeatherInfoOutputSchema
const welcomeMessagePrompt = ai.definePrompt({
  name: 'enhancedWelcomeMessagePrompt',
  input: { schema: WelcomeMessageInputSchema.extend({ weatherData: WeatherInfoOutputSchema.optional() }) },
  output: { schema: WelcomeMessageOutputSchema }, // Instructs Genkit to expect JSON matching this schema
  prompt: `Sen bir Pazarlama Merkezi uygulamasında kullanıcıları karşılayan, son derece pozitif, esprili ve motive edici bir asistansın.
Gönderdiğin yanıtın SADECE ve SADECE aşağıdaki JSON formatında olduğundan emin ol:
{
  "message": "üretilecek kişiselleştirilmiş mesaj buraya gelecek"
}

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
Bugünün Saatlik Tahmini ({{location}}):
{{#each weatherData.todayHourlyForecast}}
- {{time}}: {{temp}}°C, {{description}}, Yağış: {{pop}}%
{{/each}}
{{else}}
Bugün için saatlik tahmin detayı bulunmuyor.
{{/if}}

{{#if weatherData.threeDaySummaryForecast.length}}
Önümüzdeki 3 Günün Özeti ({{location}}):
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
Bugün için planlanmış herhangi bir takvim etkinliği bulunmamaktadır.
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
1. Kullanıcıyı ismiyle sıcak bir şekilde selamla.
2. {{#if weatherData.currentWeather}}Şu anki hava durumunu ({{weatherData.currentWeather.description}}, {{weatherData.currentWeather.temp}}°C) mesajına doğal bir şekilde dahil et.{{/if}}
3. {{#if weatherData.todayHourlyForecast.length}}**Bugünün saatlik tahminini dikkate alarak GÜNLÜK PRATİK TAVSİYELER ver.**
    * Örneğin, eğer öğleden sonra yağış olasılığı yüksekse, "Bugün {{location}} şehrinde hava {{weatherData.currentWeather.description}} ve {{weatherData.currentWeather.temp}}°C civarında. Öğleden sonra yağmur uğrayabilir, şemsiyeni yanında bulundursan iyi olur!" gibi bir ifade kullan.
    * Eğer belirli saatlerde sıcaklık çok artıyorsa, "Saat ... civarı sıcaklık ...°C'ye kadar çıkabilir, dışarıdaysan bol su içmeyi ve güneşten korunmayı unutma!" gibi bir uyarı ekle.
    * Bu tavsiyeleri eğlenceli ve samimi bir dille aktar. Her zaman olmasa da, uygun olduğunda bu tür detaylara gir.{{/if}}
4. Eğer varsa, bugünün takvim etkinliklerinden kısaca bahset.
5. Eğer varsa, kullanıcıya atanmış projelerin genel durumuna değin.
6. Tüm bu bilgileri kullanarak, kullanıcının o günkü durumuna uygun, kişiselleştirilmiş, motive edici ve cesaretlendirici bir mesaj oluştur.
7. Mesajının sonunda "İyi çalışmalar!", "Harika bir gün geçir!" veya benzeri pozitif bir kapanış yap.
8. Eğer takvimde etkinlik yoksa veya atanmış proje yoksa, bunu da olumlu bir şekilde ifade et. ("Bugün takvimde bir şey görünmüyor, belki kendine biraz zaman ayırabilirsin?" gibi)
9. Eğer hava durumu verisi alınamazsa (weatherData boş veya error içeriyorsa), bunu nazikçe belirt ("Hava durumu bilgisine şu an ulaşılamıyor ama...") ve genel bir karşılama yap.
10. UNUTMA: Yanıtın SADECE ve SADECE belirtilen JSON formatında olmalıdır: { "message": "..." } Başka hiçbir metin, açıklama veya giriş cümlesi içermemelidir.
`,
});

// This is the main async function that will be exported.
export async function generateWelcomeMessage(input: WelcomeMessageInput): Promise<WelcomeMessageOutput> {
  let weatherData: WeatherInfoOutput | undefined;
  try {
    weatherData = await getWeatherForecast({ location: input.location });
    if (weatherData.error) {
      console.warn(`[AI Welcome Flow] Weather data could not be fetched for ${input.location}: ${weatherData.error}. Proceeding with error info for AI.`);
      // AI prompt is designed to handle missing/errored weatherData
    }
  } catch (error: any) {
    console.error(`[AI Welcome Flow] Error fetching weather data for user ${input.userName}: ${error.message}. Proceeding without weather data.`);
    // weatherData will remain undefined, AI prompt should handle this.
  }

  try {
    // Log the input being sent to the prompt
    console.log(`[AI Welcome Flow] Calling welcomeMessagePrompt for user ${input.userName}. Input to AI (excluding weather for brevity):`, { ...input, weatherDataIsPresent: !!weatherData, weatherError: weatherData?.error });

    const response = await welcomeMessagePrompt({...input, weatherData });
    const modelOutput = response.output; // Genkit v1.x: output is already parsed or undefined if parsing failed

    // Log the raw response from the AI
    const rawContent = response.raw?.choices?.[0]?.message?.content;
    console.log(`[AI Welcome Flow] Raw AI response for user ${input.userName}:`, rawContent);
    console.log(`[AI Welcome Flow] Parsed AI output (modelOutput) for user ${input.userName}:`, modelOutput);


    if (modelOutput && typeof modelOutput.message === 'string' && modelOutput.message.trim() !== '') {
      return modelOutput;
    }
    
    console.warn(`[AI Welcome Flow] AI welcome message prompt returned null, empty, or malformed output for user ${input.userName}. Falling back to default message.`);
    console.warn(`[AI Welcome Flow] Details: modelOutput.message was "${modelOutput?.message}". Raw content was: "${rawContent}"`);
    return { message: `Merhaba ${input.userName}, Pazarlama Merkezi'ne hoş geldiniz! Bugün ${input.date}, saat ${input.time}. Sistemimiz şu anda size özel bir mesaj üretemiyor, ancak harika bir gün geçirmenizi dileriz!` };

  } catch (error: any) {
    console.error(
      `[AI Welcome Flow] Critical error calling welcomeMessagePrompt for user ${input.userName}. Error: ${error.message}. Input (excluding weather for brevity): ${JSON.stringify({ ...input, weatherDataIsPresent: !!weatherData, weatherError: weatherData?.error })}. Falling back to default welcome message.`,
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    
    let fallbackMessage = `Merhaba ${input.userName}, Pazarlama Merkezi'ne hoş geldiniz!`;
    if (input.date && input.time) {
      fallbackMessage = `Merhaba ${input.userName}, Pazarlama Merkezi'ne hoş geldiniz! Bugün ${input.date}, saat ${input.time}. Sistemimiz şu anda size özel bir mesaj üretemiyor, ancak harika bir gün geçirmenizi dileriz!`;
    }
    return { message: fallbackMessage };
  }
}
