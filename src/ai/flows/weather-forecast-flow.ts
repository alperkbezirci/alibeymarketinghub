
'use server';
/**
 * @fileOverview A Genkit flow to fetch and process weather forecast data.
 * - getWeatherForecast - Fetches current weather and a 3-day forecast.
 * - WeatherRequestInput - Input schema for the location.
 * - WeatherInfoOutput - Output schema for the structured weather data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import axios from 'axios';
import {format, parseISO, addDays, startOfDay} from 'date-fns';
import {tr} from 'date-fns/locale';

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

export const WeatherRequestInputSchema = z.object({
  location: z.string().describe('Hava durumu bilgisi alınacak şehir ve ülke, örn: Antalya, Türkiye'),
});
export type WeatherRequestInput = z.infer<typeof WeatherRequestInputSchema>;

const HourlyDetailSchema = z.object({
  time: z.string().describe("Saat (HH:MM formatında)."),
  temp: z.number().describe("Sıcaklık (Celsius)."),
  description: z.string().describe("Hava durumu açıklaması."),
  icon: z.string().describe("OpenWeatherMap ikon kodu."),
  pop: z.number().describe("Yağış olasılığı (0-100%).")
});

const DailyForecastSchema = z.object({
  date: z.string().describe("Tahmin günü (örn: Pazartesi, Yarın)."),
  dayName: z.string().describe("Günün tam adı (örn: 25 Haziran Salı)."),
  minTemp: z.number().describe("Gün için minimum sıcaklık (Celsius)."),
  maxTemp: z.number().describe("Gün için maksimum sıcaklık (Celsius)."),
  description: z.string().describe("Gün için genel hava durumu açıklaması."),
  icon: z.string().describe("Gün için OpenWeatherMap ikon kodu."),
  precipitationChance: z.number().describe("Gün için en yüksek yağış olasılığı (0-100%)."),
});

export const WeatherInfoOutputSchema = z.object({
  currentWeather: z.object({
    temp: z.number().describe("Mevcut sıcaklık (Celsius)."),
    description: z.string().describe("Mevcut hava durumu açıklaması."),
    icon: z.string().describe("Mevcut hava durumu için OpenWeatherMap ikon kodu."),
    feelsLike: z.number().describe("Hissedilen sıcaklık (Celsius)."),
    humidity: z.number().describe("Nem oranı (%)."),
    windSpeed: z.number().describe("Rüzgar hızı (m/s)."),
  }).describe("Anlık hava durumu bilgileri."),
  todayHourlyForecast: z.array(HourlyDetailSchema).describe("Bugünün 3 saatlik detaylı hava durumu tahmini."),
  threeDaySummaryForecast: z.array(DailyForecastSchema).describe("Gelecek 3 gün için özetlenmiş günlük hava durumu tahmini."),
  location: z.string().describe("Hava durumu bilgisinin ait olduğu konum (Şehir, Ülke)."),
  error: z.string().optional().describe("Hava durumu alınırken bir hata oluşursa mesaj."),
});
export type WeatherInfoOutput = z.infer<typeof WeatherInfoOutputSchema>;


async function fetchAndProcessWeather(location: string): Promise<WeatherInfoOutput> {
  if (!OPENWEATHERMAP_API_KEY) {
    console.error("OpenWeatherMap API key is not configured.");
    return {
      // @ts-ignore
      currentWeather: {}, todayHourlyForecast: [], threeDaySummaryForecast: [],
      location,
      error: "Hava durumu servisi yapılandırılamadı (API anahtarı eksik)."
    };
  }

  try {
    // 1. Fetch current weather
    const currentWeatherResponse = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { q: location, appid: OPENWEATHERMAP_API_KEY, units: 'metric', lang: 'tr' },
    });
    const cwData = currentWeatherResponse.data;
    const currentWeatherData = {
      temp: Math.round(cwData.main.temp),
      description: cwData.weather[0].description,
      icon: cwData.weather[0].icon,
      feelsLike: Math.round(cwData.main.feels_like),
      humidity: cwData.main.humidity,
      windSpeed: cwData.wind.speed,
    };

    // 2. Fetch 5-day/3-hour forecast
    const forecastResponse = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: { q: location, appid: OPENWEATHERMAP_API_KEY, units: 'metric', lang: 'tr' },
    });
    const forecastRawData = forecastResponse.data.list;

    const todayISO = new Date().toISOString().split('T')[0];
    const processedHourlyToday: WeatherInfoOutput['todayHourlyForecast'] = [];
    const dailySummaries: Record<string, {
        dateObj: Date;
        temps: number[];
        pops: number[];
        icons: string[];
        descs: string[];
    }> = {};

    for (const item of forecastRawData) {
        const itemDateTime = parseISO(item.dt_txt);
        const itemDateISO = item.dt_txt.split(' ')[0];

        // Process today's hourly forecast
        if (itemDateISO === todayISO) {
            processedHourlyToday.push({
                time: format(itemDateTime, 'HH:mm'),
                temp: Math.round(item.main.temp),
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                pop: Math.round(item.pop * 100),
            });
        }

        // Aggregate data for daily summaries (today and next 3 days)
        if (itemDateISO >= todayISO) {
            if (!dailySummaries[itemDateISO]) {
                if (Object.keys(dailySummaries).length >= 4) continue; // Limit to today + 3 days
                dailySummaries[itemDateISO] = {
                    dateObj: startOfDay(itemDateTime),
                    temps: [],
                    pops: [],
                    icons: [],
                    descs: [],
                };
            }
            if (dailySummaries[itemDateISO]) { // Check again due to the limit condition
                dailySummaries[itemDateISO].temps.push(item.main.temp);
                dailySummaries[itemDateISO].pops.push(item.pop * 100);
                dailySummaries[itemDateISO].icons.push(item.weather[0].icon);
                dailySummaries[itemDateISO].descs.push(item.weather[0].description);
            }
        }
    }
    
    const processedThreeDaySummary: WeatherInfoOutput['threeDaySummaryForecast'] = [];
    const sortedDates = Object.keys(dailySummaries).sort();

    // Start from tomorrow for the "threeDaySummaryForecast"
    let forecastDaysCount = 0;
    for (const dateISO of sortedDates) {
        if (dateISO === todayISO) continue; // Skip today for the 3-day summary cards, it's handled by hourly.
        if (forecastDaysCount >= 3) break;

        const dayData = dailySummaries[dateISO];
        const minTemp = Math.round(Math.min(...dayData.temps));
        const maxTemp = Math.round(Math.max(...dayData.temps));
        const precipitationChance = Math.round(Math.max(...dayData.pops));
        
        // For dominant icon/description, we can pick the one from midday or most frequent
        // Simple approach: pick from the middle of the day's entries
        const midIndex = Math.floor(dayData.icons.length / 2);
        const icon = dayData.icons[midIndex] || dayData.icons[0];
        const description = dayData.descs[midIndex] || dayData.descs[0];
        
        let dayName = format(dayData.dateObj, 'eeee', {locale: tr});
        if (dateISO === format(addDays(new Date(), 1), 'yyyy-MM-dd')) {
            dayName = "Yarın";
        }

        processedThreeDaySummary.push({
            date: dayName,
            dayName: format(dayData.dateObj, 'd MMMM eeee', {locale: tr}),
            minTemp,
            maxTemp,
            icon,
            description,
            precipitationChance,
        });
        forecastDaysCount++;
    }


    return {
      currentWeather: currentWeatherData,
      todayHourlyForecast: processedHourlyToday,
      threeDaySummaryForecast: processedThreeDaySummary,
      location,
    };

  } catch (error: any) {
    console.error("Error fetching or processing weather data:", error.response?.data || error.message);
    return {
      // @ts-ignore
      currentWeather: {}, todayHourlyForecast: [], threeDaySummaryForecast: [],
      location,
      error: `Hava durumu alınırken bir hata oluştu: ${error.response?.data?.message || error.message}`
    };
  }
}


export const getWeatherForecastFlow = ai.defineFlow(
  {
    name: 'getWeatherForecastFlow',
    inputSchema: WeatherRequestInputSchema,
    outputSchema: WeatherInfoOutputSchema,
  },
  async (input) => {
    return fetchAndProcessWeather(input.location);
  }
);

// Wrapper function for client-side usage
export async function getWeatherForecast(input: WeatherRequestInput): Promise<WeatherInfoOutput> {
  return getWeatherForecastFlow(input);
}
