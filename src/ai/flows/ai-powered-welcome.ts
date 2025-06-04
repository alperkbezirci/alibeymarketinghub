
'use server';

/**
 * @fileOverview An AI-powered welcome message flow that incorporates
 * weather (via a separate flow), today's calendar events, and user's project overview
 * to generate a personalized and motivational message.
 * This file is marked with 'use server' and should only export async functions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getWeatherForecast } from './weather-forecast-flow';
import { WeatherInfoOutputSchema, type WeatherInfoOutput } from '@/ai/schemas/weather-schemas';

const WelcomeMessageInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
  todaysEvents: z.array(z.string()).describe('A list of today\'s scheduled calendar event titles or summaries. Empty if no events.'),
  userProjectsSummary: z.array(z.string()).describe('A list of summaries for projects assigned to the user, e.g., ["Proje X (Devam Ediyor)", "Proje Y (Tamamlandı)"]. Empty if no projects.'),
});
export type WelcomeMessageInput = z.infer<typeof WelcomeMessageInputSchema>;

const WelcomeMessageOutputSchema = z.object({
  message: z.string().describe('The personalized and motivational welcome message.'),
});
export type WelcomeMessageOutput = z.infer<typeof WelcomeMessageOutputSchema>;

const welcomeMessagePrompt = ai.definePrompt({
  name: 'enhancedWelcomeMessagePrompt',
  input: { schema: WelcomeMessageInputSchema.extend({ weatherData: WeatherInfoOutputSchema.optional() }) },
  output: { schema: WelcomeMessageOutputSchema },
  prompt: `Sen kullanıcıları karşılayan, son derece pozitif, esprili ve motive edici bir asistansın.
Çok Önemli: Yanıtın KESİNLİKLE ve SADECE aşağıdaki JSON formatında olmalıdır. JSON bloğunun ÖNCESİNDE veya SONRASINDA kesinlikle başka hiçbir metin, açıklama veya karakter olmamalıdır.
{
  "message": "üretilecek kişiselleştirilmiş mesaj buraya gelecek"
}
---
Kullanıcı Adı: {{userName}}

{{#unless weatherData.error}}
  {{#if weatherData.currentWeather}}
Şu anki Hava Durumu ({{weatherData.location}}):
Sıcaklık: {{weatherData.currentWeather.temp}}°C (Hissedilen: {{weatherData.currentWeather.feelsLike}}°C)
Durum: {{weatherData.currentWeather.description}}
Nem: {{weatherData.currentWeather.humidity}}%
Rüzgar: {{weatherData.currentWeather.windSpeed}} m/s
  {{else}}
Anlık hava durumu detayları (currentWeather) alınamadı.
  {{/if}}

  {{#if weatherData.todayHourlyForecast.length}}
Bugünün Saatlik Tahmini ({{weatherData.location}}):
    {{#each weatherData.todayHourlyForecast}}
- {{time}}: {{temp}}°C, {{description}}, Yağış: {{pop}}%
    {{/each}}
  {{else}}
Bugün için saatlik tahmin detayı bulunmuyor.
  {{/if}}

  {{#if weatherData.threeDaySummaryForecast.length}}
Önümüzdeki 3 Günün Özeti ({{weatherData.location}}):
    {{#each weatherData.threeDaySummaryForecast}}
- {{date}} ({{dayName}}): En Düşük {{minTemp}}°C, En Yüksek {{maxTemp}}°C, {{description}}, Yağış İhtimali: {{precipitationChance}}%
    {{/each}}
  {{else}}
Gelecek günler için özet tahmin bilgisi alınamadı.
  {{/if}}
{{else}}
Hava durumu bilgisi alınamadı. {{#if weatherData.location}}({{weatherData.location}} için {{weatherData.error}}){{else}}({{weatherData.error}}){{/if}}
{{/unless}}

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
1. Kullanıcıyı ismiyle sıcak bir şekilde "Merhaba {{userName}}," şeklinde selamla.
2. {{#unless weatherData.error}}{{#if weatherData.currentWeather}}Şu anki hava durumunu ({{weatherData.currentWeather.description}}, {{weatherData.currentWeather.temp}}°C) mesajına doğal bir şekilde dahil et.{{/if}}{{/unless}}
3. {{#unless weatherData.error}}{{#if weatherData.todayHourlyForecast.length}}**Bugünün saatlik tahminini dikkate alarak GÜNLÜK PRATİK TAVSİYELER ver.**
    * Örneğin, eğer saatlik tahminlerde öğleden sonra yağış olasılığı yüksekse, "Öğleden sonra yağmur bekleniyor, şemsiyeni yanında bulundurmak iyi bir fikir olabilir!" gibi bir ifade kullan.
    * Eğer belirli saatlerde sıcaklık çok artıyorsa, "Günün ilerleyen saatlerinde sıcaklık artabilir, dışarıdaysan bol su içmeyi ve güneşten korunmayı unutma!" gibi bir uyarı ekle.
    * Bu tavsiyeleri eğlenceli ve samimi bir dille aktar. Her zaman olmasa da, uygun olduğunda bu tür detaylara gir.{{/if}}{{/unless}}
4. Eğer varsa, bugünün takvim etkinliklerinden kısaca bahset.
5. Eğer varsa, kullanıcıya atanmış projelerin genel durumuna değin.
6. Tüm bu bilgileri kullanarak, kullanıcının o günkü durumuna uygun, kişiselleştirilmiş, motive edici ve cesaretlendirici bir mesaj oluştur.
7. Mesajının sonunda "İyi çalışmalar!", "Harika bir gün geçir!" veya benzeri pozitif bir kapanış yap.
8. Eğer takvimde etkinlik yoksa veya atanmış proje yoksa, bunu da olumlu bir şekilde ifade et. ("Bugün takvimde bir şey görünmüyor, belki kendine biraz zaman ayırabilirsin?" gibi)
9. Eğer hava durumu verisi alınamazsa (weatherData boş veya error içeriyorsa), bunu nazikçe belirt ("Hava durumu bilgisine şu an ulaşılamıyor ama...") ve genel bir karşılama yap. (Bu durum zaten üstteki {{#unless weatherData.error}} bloğu ile ele alınıyor.)
10. UNUTMA: Yanıtın SADECE ve SADECE belirtilen JSON formatında olmalıdır: { "message": "..." } Başka hiçbir metin, açıklama veya giriş cümlesi içermemelidir.
`,
});

export async function generateWelcomeMessage(input: WelcomeMessageInput): Promise<WelcomeMessageOutput> {
  console.log(`[AI Welcome Flow] ENTERING generateWelcomeMessage for user ${input.userName}`);
  let weatherData: WeatherInfoOutput | undefined;
  const locationForWeather = "Antalya, Türkiye"; // Sabit konum

  try {
    console.log(`[AI Welcome Flow] Attempting to fetch weather for user ${input.userName} at location: ${locationForWeather}`);
    weatherData = await getWeatherForecast({ location: locationForWeather });
    if (weatherData.error) {
      console.warn(`[AI Welcome Flow] Weather data could not be fetched for ${locationForWeather}: ${weatherData.error}. Proceeding with error info for AI.`);
    } else {
      console.log(`[AI Welcome Flow] Weather data fetched successfully for ${locationForWeather}. Has currentWeather: ${!!weatherData.currentWeather}`);
    }
  } catch (error: any) {
    console.error(`[AI Welcome Flow] Error fetching weather data for user ${input.userName} (location: ${locationForWeather}): ${error.message}. Proceeding without weather data.`);
    weatherData = {
      error: "Hava durumu bilgileri alınamadı (akış içi hata).",
      location: locationForWeather // Hata durumunda bile konumu ekleyelim
    };
  }

  try {
    const promptInput = { ...input, weatherData };
    console.log(`[AI Welcome Flow] Calling welcomeMessagePrompt for user ${input.userName}. Full input to prompt: ${JSON.stringify(promptInput, null, 2)}`);

    const response = await welcomeMessagePrompt(promptInput);
    const modelOutput = response.output;

    const rawContent = response.raw?.choices?.[0]?.message?.content ?? 'Raw response could not be obtained or was empty.';
    console.log(`[AI Welcome Flow] Raw AI response for user ${input.userName}:`, rawContent);
    console.log(`[AI Welcome Flow] Parsed AI output (modelOutput) for user ${input.userName}:`, modelOutput);

    if (modelOutput && typeof modelOutput.message === 'string' && modelOutput.message.trim() !== '') {
      console.log(`[AI Welcome Flow] Successfully generated AI message for ${input.userName}.`);
      return modelOutput;
    }
    
    console.warn(`[AI Welcome Flow] AI welcome message prompt returned null, empty, or malformed output for user ${input.userName}. Falling back to default message.`);
    console.warn(`[AI Welcome Flow] Details: modelOutput.message was "${modelOutput?.message}". Raw content was: "${rawContent}"`);
    return { message: `Merhaba ${input.userName}, Pazarlama Merkezi'ne hoş geldiniz! Sistemimiz (AI format sorunu) size özel bir mesaj üretemiyor, ancak harika bir gün geçirmenizi dileriz!` };

  } catch (promptError: any) {
    console.error(
      `[AI Welcome Flow] Error DURING welcomeMessagePrompt call for user ${input.userName}. Error: ${promptError.message}. Input to AI (excluding weather for brevity): ${JSON.stringify({ ...input, weatherDataIsPresent: !!weatherData, weatherError: weatherData?.error })}. Falling back to default welcome message.`,
      JSON.stringify(promptError, Object.getOwnPropertyNames(promptError))
    );
    return { message: `Merhaba ${input.userName}, Pazarlama Merkezi'ne hoş geldiniz! Sistemimiz (prompt hatası) size özel bir mesaj üretemiyor, ancak harika bir gün geçirmenizi dileriz!` };
  }
}

    