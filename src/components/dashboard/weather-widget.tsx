
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
import { cn } from '@/lib/utils';

interface WeatherWidgetProps {
  initialLocation?: string;
}

const DEFAULT_LOCATION = "Side, Türkiye";

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
      const data = await getWeatherForecast({ location });
      if (data.error) {
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
        setError("Hava durumu verileri alınamadı veya belirtilen konum için veri bulunmuyor.");
        setWeatherData(null);
      } else {
        setWeatherData(data);
      }
    } catch (err: any) {
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
      <Card className="shadow-lg w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {/* Current weather skeleton */}
          <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-6 p-4 rounded-lg border">
            <Skeleton className="h-24 w-24 rounded-md mb-3 sm:mb-0" /> {/* Icon */}
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <Skeleton className="h-12 w-32 mx-auto sm:mx-0" /> {/* Temp */}
              <Skeleton className="h-5 w-40 mx-auto sm:mx-0" /> {/* Description */}
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm pt-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            </div>
          </div>
          
          <Separator />
          {/* Hourly forecast skeleton */}
          <div>
            <Skeleton className="h-5 w-1/3 mb-3" />
            <div className="flex space-x-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-32 w-20 rounded-lg" />)}
            </div>
          </div>
          
          <Separator />
          {/* Daily forecast skeleton */}
          <div>
            <Skeleton className="h-5 w-1/3 mb-3" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive w-full">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" /> Hava Durumu Hatası
          </CardTitle>
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
      <Card className="shadow-lg w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <CloudOff className="mr-2 h-5 w-5 text-muted-foreground" /> Hava Durumu
          </CardTitle>
           <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Hava durumunu yenile">
             <RefreshCw className="h-4 w-4" />
           </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            "{location}" için hava durumu bilgisi bulunamadı.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { currentWeather, todayHourlyForecast, threeDaySummaryForecast } = weatherData;

  return (
    <Card className="shadow-lg w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-xl font-headline flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" /> {weatherData.location || location}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Hava durumunu yenile">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {/* Current Weather Section */}
        {currentWeather && (
          <div className="flex flex-col items-center sm:flex-row sm:items-center sm:space-x-6 p-4 rounded-lg border bg-muted/30">
            {currentWeather.icon && (
              <Image
                src={`https://openweathermap.org/img/wn/${currentWeather.icon}@4x.png`}
                alt={currentWeather.description || "Hava durumu ikonu"}
                width={100}
                height={100}
                className="flex-shrink-0 -mt-2 -mb-2 sm:m-0"
                data-ai-hint="weather condition"
              />
            )}
            <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
              <p className="text-5xl sm:text-6xl font-bold text-primary">{currentWeather.temp}°C</p>
              <p className="text-lg capitalize text-muted-foreground">{currentWeather.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs sm:text-sm mt-3 sm:mt-0 sm:flex sm:flex-col sm:space-y-1 sm:text-right">
              <div className="flex items-center sm:justify-end"><Thermometer className="mr-1.5 h-4 w-4 text-muted-foreground" /> {currentWeather.feelsLike}°C</div>
              <div className="flex items-center sm:justify-end"><Droplets className="mr-1.5 h-4 w-4 text-muted-foreground" /> %{currentWeather.humidity}</div>
              <div className="flex items-center sm:justify-end"><Wind className="mr-1.5 h-4 w-4 text-muted-foreground" /> {currentWeather.windSpeed}m/s</div>
            </div>
          </div>
        )}

        {/* Hourly Forecast Section */}
        {todayHourlyForecast && todayHourlyForecast.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-2 flex items-center">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" /> Bugün Saatlik
            </h3>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-3 pb-3">
                {todayHourlyForecast.map((hourly, index) => (
                  <div key={index} className="flex flex-col items-center p-2.5 border rounded-lg min-w-[80px] bg-background shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-medium">{hourly.time}</p>
                    {hourly.icon && (
                      <Image
                        src={`https://openweathermap.org/img/wn/${hourly.icon}@2x.png`}
                        alt={hourly.description}
                        width={40}
                        height={40}
                        data-ai-hint="weather condition"
                      />
                    )}
                    <p className="text-sm font-semibold">{hourly.temp}°</p>
                    {hourly.pop > 0 && <p className="text-xs text-blue-600 dark:text-blue-400">{hourly.pop}%</p>}
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Daily Forecast Section */}
        {threeDaySummaryForecast && threeDaySummaryForecast.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-2 flex items-center">
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" /> 3 Günlük Tahmin
            </h3>
            <div className="space-y-2">
              {threeDaySummaryForecast.map((daily, index) => (
                <div key={index} className="flex items-center justify-between p-2.5 border rounded-lg bg-background shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col">
                     <p className="text-sm font-medium">{daily.date}</p>
                     <p className="text-xs text-muted-foreground">{daily.dayName.split(' ')[0]}</p>
                  </div>
                  {daily.icon && (
                    <Image
                      src={`https://openweathermap.org/img/wn/${daily.icon}@2x.png`}
                      alt={daily.description}
                      width={40}
                      height={40}
                      data-ai-hint="weather condition"
                    />
                  )}
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-semibold">{daily.maxTemp}° <span className="text-xs text-muted-foreground">/ {daily.minTemp}°</span></p>
                    {daily.precipitationChance > 0 && <p className="text-xs text-blue-600 dark:text-blue-400">{daily.precipitationChance}% yağış</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    