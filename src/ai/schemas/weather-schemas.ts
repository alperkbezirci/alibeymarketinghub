
// src/ai/schemas/weather-schemas.ts
/**
 * @fileOverview Zod schemas and TypeScript types for weather-related data.
 * This file does NOT use the 'use server' directive.
 */
import { z } from 'zod';

export const WeatherRequestInputSchema = z.object({
  location: z.string().describe('Hava durumu bilgisi alınacak şehir ve ülke, örn: Antalya, Türkiye'),
});
export type WeatherRequestInput = z.infer<typeof WeatherRequestInputSchema>;

export const HourlyDetailSchema = z.object({
  time: z.string().describe("Saat (HH:MM formatında)."),
  temp: z.number().describe("Sıcaklık (Celsius)."),
  description: z.string().describe("Hava durumu açıklaması."),
  icon: z.string().describe("OpenWeatherMap ikon kodu."),
  pop: z.number().describe("Yağış olasılığı (0-100%).")
});

export const DailyForecastSchema = z.object({
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
  }).describe("Anlık hava durumu bilgileri.").optional(), // Made optional to handle initial state or errors
  todayHourlyForecast: z.array(HourlyDetailSchema).describe("Bugünün 3 saatlik detaylı hava durumu tahmini.").optional(),
  threeDaySummaryForecast: z.array(DailyForecastSchema).describe("Gelecek 3 gün için özetlenmiş günlük hava durumu tahmini.").optional(),
  location: z.string().describe("Hava durumu bilgisinin ait olduğu konum (Şehir, Ülke).").optional(),
  error: z.string().optional().describe("Hava durumu alınırken bir hata oluşursa mesaj."),
});
export type WeatherInfoOutput = z.infer<typeof WeatherInfoOutputSchema>;
