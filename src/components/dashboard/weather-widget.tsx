// src/components/dashboard/weather-widget.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Wind, Droplets, Sunrise, Sunset, AlertTriangle, CloudOff, Cloudy, Sun, Zap, CloudRain, Snowflake, RefreshCw, MapPin, Clock, CalendarDays } from 'lucide-react'; // Added CalendarDays
import { getWeatherForecast } from '@/ai/flows/weather-forecast-flow';
import type { WeatherInfoOutput, HourlyDetail, DailyForecast } from '@/ai/schemas/weather-schemas';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface WeatherWidgetProps {
  initialLocation?: string;
}

const DEFAULT_LOCATION = "Antalya, Türkiye";

export function WeatherWidget({ initialLocation = DEFAULT_LOCATION }: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<WeatherInfoOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location] = useState(initialLocation); // Location is fixed for now
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
        if (data.error.includes("API anahtarı eksik")) {
            setError("Hava durumu servisi için API anahtarı yapılandırılmamış. Lütfen .env dosyasını kontrol edin.");
        } else if (data.error.toLowerCase().includes("not found") || data.error.includes("404")) {
            setError(`Belirtilen konum (${location}) için hava durumu bilgisi bulunamadı.`);
        } else if (data.error.toLowerCase().includes("invalid api key")) {
             setError("Geçersiz OpenWeatherMap API anahtarı. Lütfen anahtarınızı kontrol edin.");
        }
        else {
            setError(data.error);
        }
        setWeatherData(null);
      } else if (!data.currentWeather && !data.todayHourlyForecast && !data.threeDaySummaryForecast) {
        console.warn("[WeatherWidget] Weather flow returned no data and no error.");
        setError("Hava durumu verileri alınamadı veya belirtilen konum için veri bulunmuyor.");
        setWeatherData(null);
      }
      else {
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

  const renderCurrentWeather = () => {
    if (!weatherData?.currentWeather) {
      return <p className="text-sm text-muted-foreground text-center py-4">Güncel hava durumu bilgisi mevcut değil.</p>;
    }
    const { temp, description, icon, feelsLike, humidity, windSpeed } = weatherData.currentWeather;
    return (
      <Card className="bg-card/70 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center justify-between">
            <div className="flex items-center">
             <MapPin className="mr-2 h-5 w-5 text-primary" /> {weatherData.location || location}
            </div>
            {icon && (
              <Image
                src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
                alt={description || "Hava durumu ikonu"}
                width={50}
                height={50}
                data-ai-hint="weather condition"
              />
            )}
          </CardTitle>
          <CardDescription className="capitalize">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-5xl font-bold text-primary">{temp}°C</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center"><Thermometer className="mr-2 h-4 w-4 text-muted-foreground" /> Hissedilen: {feelsLike}°C</div>
            <div className="flex items-center"><Droplets className="mr-2 h-4 w-4 text-muted-foreground" /> Nem: %{humidity}</div>
            <div className="flex items-center"><Wind className="mr-2 h-4 w-4 text-muted-foreground" /> Rüzgar: {windSpeed} m/s</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderHourlyForecast = () => {
    if (!weatherData?.todayHourlyForecast || weatherData.todayHourlyForecast.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">Bugün için saatlik tahmin bulunmamaktadır.</p>;
    }
    return (
      <Card className="bg-card/70 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-headline flex items-center"><Clock className="mr-2 h-5 w-5 text-primary" /> Bugün Saatlik Tahmin</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-4 pb-4">
              {weatherData.todayHourlyForecast.map((hourly, index) => (
                <div key={index} className="flex flex-col items-center p-3 border rounded-lg min-w-[100px] bg-background/50">
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
                  <p className="text-lg font-semibold">{hourly.temp}°</p>
                  <p className="text-xs text-muted-foreground capitalize truncate w-full text-center" title={hourly.description}>{hourly.description}</p>
                  <p className="text-xs text-blue-500">{hourly.pop}% <CloudRain className="inline h-3 w-3"/></p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  const renderDailyForecast = () => {
    if (!weatherData?.threeDaySummaryForecast || weatherData.threeDaySummaryForecast.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">Gelecek günler için tahmin bulunmamaktadır.</p>;
    }
    return (
      <Card className="bg-card/70 shadow-md">
        <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary" /> Gelecek 3 Gün</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {weatherData.threeDaySummaryForecast.map((daily, index) => (
            <Card key={index} className="p-4 flex flex-col items-center text-center bg-background/50">
              <p className="text-base font-semibold">{daily.date}</p>
              <p className="text-xs text-muted-foreground mb-1">{daily.dayName.split(',')[0]}</p> {/* Show only day name */}
              {daily.icon && (
                <Image
                  src={`https://openweathermap.org/img/wn/${daily.icon}@2x.png`}
                  alt={daily.description}
                  width={60}
                  height={60}
                  data-ai-hint="weather condition"
                />
              )}
              <p className="text-xl font-bold">{daily.maxTemp}° <span className="text-muted-foreground">/ {daily.minTemp}°</span></p>
              <p className="text-xs text-muted-foreground capitalize mt-1 h-8 overflow-hidden" title={daily.description}>{daily.description}</p>
              <p className="text-xs text-blue-500 mt-1">{daily.precipitationChance}% <CloudRain className="inline h-3 w-3"/></p>
            </Card>
          ))}
        </CardContent>
      </Card>
    );
  };


  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-2/5 mb-2" />
          <Skeleton className="h-4 w-3/5" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-12 w-1/2" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>
          <Separator />
          <div className="flex space-x-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-24 rounded-lg" />)}
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
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
        <CardHeader>
          <CardTitle className="flex items-center">
            <CloudOff className="mr-2 h-5 w-5 text-muted-foreground" /> Hava Durumu
          </CardTitle>
          <CardDescription>Veri bulunamadı veya yüklenemedi.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            "{location}" için hava durumu bilgisi bulunamadı veya servis geçici olarak kullanılamıyor.
          </p>
          <Button variant="outline" onClick={fetchWeather} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" /> Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    );
  }
  

  return (
    <div className="space-y-6">
      {renderCurrentWeather()}
      {renderHourlyForecast()}
      {renderDailyForecast()}
    </div>
  );
}
