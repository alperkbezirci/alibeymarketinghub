
'use server';
/**
 * @fileOverview A Genkit flow to fetch and process weather forecast data using OpenWeatherMap.
 * This file is marked with 'use server' and should only export async functions.
 * - getWeatherForecast - Fetches current weather, today's hourly, and a 3-day forecast.
 */

import { config as dotenvConfig } from 'dotenv'; // Import dotenv
dotenvConfig(); // Load .env file contents into process.env

import axios from 'axios';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { WeatherRequestInput, WeatherInfoOutput } from '@/ai/schemas/weather-schemas'; // Import types

// Read the API key AFTER dotenv.config() has been called
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

async function fetchAndProcessWeather(location: string): Promise<WeatherInfoOutput> {
  // Log the API key value that the function sees
  console.log('[weather-forecast-flow] Attempting to use OPENWEATHERMAP_API_KEY:', OPENWEATHERMAP_API_KEY ? 'Key Found (length: ' + OPENWEATHERMAP_API_KEY.length + ')' : 'Key NOT Found');

  if (!OPENWEATHERMAP_API_KEY) {
    console.error("[weather-forecast-flow] OpenWeatherMap API key is not configured in process.env. Please check your .env file and server restart.");
    return {
      location,
      error: "Hava durumu servisi yapılandırılamadı (API anahtarı eksik)."
    };
  }

  try {
    // 1. Fetch current weather
    let currentWeatherData: WeatherInfoOutput['currentWeather'] | undefined;
    try {
        const currentWeatherResponse = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
            params: { q: location, appid: OPENWEATHERMAP_API_KEY, units: 'metric', lang: 'tr' },
        });
        const cwData = currentWeatherResponse.data;
        currentWeatherData = {
            temp: Math.round(cwData.main.temp),
            description: cwData.weather[0].description,
            icon: cwData.weather[0].icon,
            feelsLike: Math.round(cwData.main.feels_like),
            humidity: cwData.main.humidity,
            windSpeed: cwData.wind.speed,
        };
    } catch (currentError: unknown) {
        let message = "Bilinmeyen bir hata oluştu";
        if (currentError instanceof Error) {
            message = currentError.message;
        } else if (typeof currentError === 'string') {
            message = currentError;
        }
        console.warn(`[weather-forecast-flow] Could not fetch current weather for ${location}: ${message}`);
        // Continue to fetch forecast even if current weather fails
    }


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

        // Aggregate data for daily summaries (next 3 days, not including today for this summary array)
        if (itemDateISO >= todayISO) { // Start from today for aggregation
            if (!dailySummaries[itemDateISO]) {
                // Limit to processing data for today + next 3 days for summaries array
                if (Object.keys(dailySummaries).length >= 4 && itemDateISO !== todayISO) continue;
                dailySummaries[itemDateISO] = {
                    dateObj: startOfDay(itemDateTime),
                    temps: [],
                    pops: [],
                    icons: [],
                    descs: [],
                };
            }
             if (dailySummaries[itemDateISO]) {
                dailySummaries[itemDateISO].temps.push(item.main.temp);
                dailySummaries[itemDateISO].pops.push(item.pop * 100);
                dailySummaries[itemDateISO].icons.push(item.weather[0].icon);
                dailySummaries[itemDateISO].descs.push(item.weather[0].description);
            }
        }
    }

    const processedThreeDaySummary: WeatherInfoOutput['threeDaySummaryForecast'] = [];
    const sortedDates = Object.keys(dailySummaries).sort();

    let forecastDaysCount = 0;
    for (const dateISO of sortedDates) {
        if (dateISO === todayISO) continue; // Skip today for the 3-day summary cards, it's handled by hourly.
        if (forecastDaysCount >= 3) break;

        const dayData = dailySummaries[dateISO];
        const minTemp = Math.round(Math.min(...dayData.temps));
        const maxTemp = Math.round(Math.max(...dayData.temps));
        const precipitationChance = Math.round(Math.max(...dayData.pops));

        const midIndex = Math.floor(dayData.icons.length / 2);
        const icon = dayData.icons[midIndex] || dayData.icons[0];
        const description = dayData.descs[midIndex] || dayData.descs[0];

        let dayNameDisplay = format(dayData.dateObj, 'eeee', {locale: tr});
        if (dateISO === format(addDays(new Date(), 1), 'yyyy-MM-dd')) {
            dayNameDisplay = "Yarın";
        }

        processedThreeDaySummary.push({
            date: dayNameDisplay, // "Yarın" or "Salı"
            dayName: format(dayData.dateObj, 'd MMMM eeee', {locale: tr}), // Full date like "25 Haziran Salı"
            minTemp,
            maxTemp,
            icon,
            description,
            precipitationChance,
        });
        forecastDaysCount++;
    }

    if (!currentWeatherData && processedHourlyToday.length === 0 && processedThreeDaySummary.length === 0) {
        console.warn('[weather-forecast-flow] No weather data (current, hourly, or 3-day) could be processed.');
        return {
            location,
            error: "Hava durumu verileri alınamadı."
        };
    }

    return {
      currentWeather: currentWeatherData,
      todayHourlyForecast: processedHourlyToday.length > 0 ? processedHourlyToday : undefined,
      threeDaySummaryForecast: processedThreeDaySummary.length > 0 ? processedThreeDaySummary : undefined,
      location,
    };

  } catch (error: unknown) {
    let errorMessage = "Bilinmeyen bir hata oluştu";
    let responseDataMessage: string | undefined;

    if (typeof error === 'object' && error !== null && 'response' in error) {
        const responseError = error.response as { data?: { message?: string } };
        if (responseError.data?.message) {
            responseDataMessage = responseError.data.message;
        }
    }

    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    console.error("[weather-forecast-flow] Error fetching or processing weather data:", responseDataMessage || errorMessage, error);
    return {
      location,
      error: `Hava durumu alınırken bir hata oluştu: ${responseDataMessage || errorMessage}`
    };
  }
}

// Wrapper async function that is exported
export async function getWeatherForecast(input: WeatherRequestInput): Promise<WeatherInfoOutput> {
  // This function is the only export from this 'use server' file.
  // It directly calls the internal fetchAndProcessWeather.
  console.log(`[weather-forecast-flow] getWeatherForecast called for location: ${input.location}`);
  return fetchAndProcessWeather(input.location);
}

