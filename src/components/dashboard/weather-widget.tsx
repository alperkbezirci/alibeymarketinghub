// src/components/dashboard/weather-widget.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Wind, Droplets, AlertTriangle, CloudOff, RefreshCw, MapPin, Clock, CalendarDays } from 'lucide-react';
import { getWeatherForecast } from '@/ai/flows/weather-forecast-flow';
import type { WeatherInfoOutput } from '@/ai/schemas/weather-schemas';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface WeatherWidgetProps {
  initialLocation?: string;
}

const DEFAULT_LOCATION = "Side, Türkiye"; // Lokasyon güncellendi

export function WeatherWidget({ initialLocation = DEFAULT_LOCATION }: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<WeatherInfoOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location] = useState(initialLocation);
  const { toast } = useToast();

  const fetchWeather = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`[WeatherWidget] Fetching weather for: ${location}`);
      const data = await getWeatherForecast({ location });
      console.log("[WeatherWidget] Raw data received from flow:", JSON.stringify(data, null, 2));
      
      if (data.error) {
        console.error(`[WeatherWidget] Error from weather flow: ${data.error}`);
        let userErrorMessage = data.error;
        if (data.error.includes("API anahtarı eksik")) {
            userErrorMessage = "Hava durumu servisi için API anahtarı yapılandırılmamış. Lütfen .env dosyasını kontrol edin.";
        } else if (data.error.toLowerCase().includes("not found") || data.error.includes("404")) {
            userErrorMessage = `Belirtilen konum (${location}) için hava durumu bilgisi bulunamadı.`;
        } else if (data.error.toLowerCase().includes("invalid api key")) {
             userErrorMessage = "Geçersiz OpenWeatherMap API anahtarı. Lütfen anahtarınızı kontrol edin.";
        }
        setError(userErrorMessage);
        setWeatherData(null);
      } else if (!data.currentWeather && !data.todayHourlyForecast && !data.threeDaySummaryForecast) {
        console.warn("[WeatherWidget] Weather flow returned no data and no error.");
        setError("Hava durumu verileri alınamadı veya belirtilen konum için veri bulunmuyor.");
        setWeatherData(null);
      } else {
        setWeatherData(data);
      }
    } catch (err: any) {
      console.error("[WeatherWidget] Critical error fetching weather:", err);
      setError(err.message || "Hava durumu verileri yüklenirken beklenmedik bir hata oluştu.");
      setWeatherData(null);
    } finally {
      setIsLoading(false);
    }
  }, [location, toast]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" /> {/* Title: Hava Durumu: Side, Türkiye */}
            <Skeleton className="h-4 w-32" /> {/* Description: Güncel bilgiler... */}
          </div>
          <Skeleton className="h-9 w-9 rounded-full" /> {/* Refresh button */}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current weather skeleton */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16" /> {/* Icon */}
            <div className="space-y-1">
              <Skeleton className="h-10 w-24" /> {/* Temp */}
              <Skeleton className="h-4 w-32" /> {/* Description */}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          
          <Separator />
          {/* Hourly forecast skeleton */}
          <div>
            <Skeleton className="h-5 w-1/3 mb-3" /> {/* Sub-title */}
            <div className="flex space-x-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-20 rounded-lg" />)}
            </div>
          </div>
          
          <Separator />
          {/* Daily forecast skeleton */}
          <div>
            <Skeleton className="h-5 w-1/3 mb-3" /> {/* Sub-title */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" /> Hava Durumu Hatası
          </CardTitle>
          <CardDescription className="text-destructive/80">Veriler yüklenirken bir sorun oluştu.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-center py-4">{error}</p>
          <Button variant="outline" onClick={fetchWeather} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" /> Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!weatherData || (!weatherData.currentWeather && !weatherData.todayHourlyForecast && !weatherData.threeDaySummaryForecast)) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <CloudOff className="mr-2 h-5 w-5 text-muted-foreground" /> Hava Durumu
          </CardTitle>
           <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Hava durumunu yenile">
             <RefreshCw className="h-4 w-4" />
           </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            "{location}" için hava durumu bilgisi bulunamadı veya servis geçici olarak kullanılamıyor.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { currentWeather, todayHourlyForecast, threeDaySummaryForecast } = weatherData;

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl font-headline flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" /> Hava Durumu: {weatherData.location || location}
          </CardTitle>
          <CardDescription>Güncel bilgiler, saatlik ve 3 günlük tahminler.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Hava durumunu yenile">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Current Weather Section */}
        {currentWeather && (
          <div className="p-4 rounded-lg border bg-background/60">
            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-4">
              {currentWeather.icon && (
                <Image
                  src={`https://openweathermap.org/img/wn/${currentWeather.icon}@4x.png`}
                  alt={currentWeather.description || "Hava durumu ikonu"}
                  width={100}
                  height={100}
                  className="flex-shrink-0 -mt-2 -mb-2 sm:mt-0 sm:mb-0"
                  data-ai-hint="weather condition"
                />
              )}
              <div className="text-center sm:text-left">
                <p className="text-6xl font-bold text-primary">{currentWeather.temp}°C</p>
                <p className="text-lg capitalize text-muted-foreground -mt-1">{currentWeather.description}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center"><Thermometer className="mr-2 h-4 w-4 text-muted-foreground" /> Hissedilen: {currentWeather.feelsLike}°C</div>
              <div className="flex items-center"><Droplets className="mr-2 h-4 w-4 text-muted-foreground" /> Nem: %{currentWeather.humidity}</div>
              <div className="flex items-center col-span-2 sm:col-span-1"><Wind className="mr-2 h-4 w-4 text-muted-foreground" /> Rüzgar: {currentWeather.windSpeed} m/s</div>
            </div>
          </div>
        )}

        {/* Hourly Forecast Section */}
        {todayHourlyForecast && todayHourlyForecast.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary" /> Bugün Saatlik Tahmin
              </h3>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex space-x-4 pb-4">
                  {todayHourlyForecast.map((hourly, index) => (
                    <div key={index} className="flex flex-col items-center p-3 border rounded-lg min-w-[90px] bg-background/50 shadow-sm">
                      <p className="text-sm font-medium">{hourly.time}</p>
                      {hourly.icon && (
                        <Image
                          src={`https://openweathermap.org/img/wn/${hourly.icon}.png`}
                          alt={hourly.description}
                          width={40}
                          height={40}
                          data-ai-hint="weather condition"
                        />
                      )}
                      <p className="text-base font-semibold">{hourly.temp}°</p>
                      <p className="text-xs text-muted-foreground capitalize truncate w-full text-center" title={hourly.description}>{hourly.description}</p>
                      <p className="text-xs text-blue-500">{hourly.pop}%</p>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </>
        )}

        {/* Daily Forecast Section */}
        {threeDaySummaryForecast && threeDaySummaryForecast.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Gelecek 3 Gün
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {threeDaySummaryForecast.map((daily, index) => (
                  <Card key={index} className="p-3 flex flex-col items-center text-center bg-background/50 shadow-sm">
                    <p className="text-base font-semibold">{daily.date}</p>
                    <p className="text-xs text-muted-foreground mb-1">{daily.dayName.split(',')[0]}</p>
                    {daily.icon && (
                      <Image
                        src={`https://openweathermap.org/img/wn/${daily.icon}@2x.png`}
                        alt={daily.description}
                        width={50}
                        height={50}
                        data-ai-hint="weather condition"
                      />
                    )}
                    <p className="text-lg font-bold">{daily.maxTemp}° <span className="text-sm text-muted-foreground">/ {daily.minTemp}°</span></p>
                    <p className="text-xs text-muted-foreground capitalize mt-1 h-8 overflow-hidden" title={daily.description}>{daily.description}</p>
                    <p className="text-xs text-blue-500 mt-1">{daily.precipitationChance}%</p>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
