// src/components/dashboard/weather-widget.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Thermometer, Droplets, Wind, CalendarDays, Clock, RefreshCw, MapPin } from 'lucide-react';
import { getWeatherForecast } from '@/ai/flows/weather-forecast-flow';
import type { WeatherInfoOutput, DailyForecastSchema as DailyForecastType, HourlyDetailSchema as HourlyDetailType } from '@/ai/schemas/weather-schemas';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
// import { format } from 'date-fns'; // format is used inside render functions, ensure it's available or remove if not used
// import { tr } from 'date-fns/locale'; // tr locale for date-fns

const DEFAULT_LOCATION = "Side, Türkiye";

export function WeatherWidget() {
  const [weatherData, setWeatherData] = useState<WeatherInfoOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location] = useState(DEFAULT_LOCATION);
  const { toast } = useToast();

  const fetchWeather = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWeatherForecast({ location });
      if (data.error) {
        let userErrorMessage = data.error;
        if (data.error.includes("API anahtarı eksik")) userErrorMessage = "Hava durumu API anahtarı yapılandırılmamış.";
        else if (data.error.toLowerCase().includes("not found") || data.error.includes("404")) userErrorMessage = `Konum (${location}) bulunamadı.`;
        else if (data.error.toLowerCase().includes("invalid api key")) userErrorMessage = "Geçersiz API anahtarı.";
        setError(userErrorMessage);
        setWeatherData(null);
      } else if (!data.currentWeather && !data.todayHourlyForecast && !data.threeDaySummaryForecast) {
        setError("Hava durumu verisi alınamadı.");
        setWeatherData(null);
      } else {
        setWeatherData(data);
      }
    } catch (err: any) {
      setError(err.message || "Hava durumu yüklenirken bir hata oluştu.");
      setWeatherData(null);
    } finally {
      setIsLoading(false);
    }
  }, [location, toast]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const renderCurrentWeather = () => {
    if (!weatherData?.currentWeather) return (
      <div className="p-4 text-center text-muted-foreground">Güncel hava durumu verisi yok.</div>
    );
    const { temp, description, icon, feelsLike, humidity, windSpeed } = weatherData.currentWeather;
    return (
      <div className="p-4 rounded-lg bg-card/50 mb-4">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between">
          <div className="flex items-center mb-3 sm:mb-0">
            <Image src={`https://openweathermap.org/img/wn/${icon}@2x.png`} alt={description || "Hava durumu"} width={64} height={64} data-ai-hint="weather condition" />
            <div className="ml-4">
              <p className="text-4xl font-bold text-primary">{temp}°C</p>
              <p className="text-sm text-muted-foreground capitalize">{description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center">
              <Thermometer className="mr-2 h-4 w-4 text-muted-foreground" /> Hissedilen: {feelsLike}°C
            </div>
            <div className="flex items-center">
              <Droplets className="mr-2 h-4 w-4 text-muted-foreground" /> Nem: {humidity}%
            </div>
            <div className="flex items-center">
              <Wind className="mr-2 h-4 w-4 text-muted-foreground" /> Rüzgar: {windSpeed} m/s
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHourlyForecast = () => {
    if (!weatherData?.todayHourlyForecast || weatherData.todayHourlyForecast.length === 0) return (
       <p className="text-sm text-muted-foreground text-center py-4">Bugün için saatlik tahmin bulunmuyor.</p>
    );
    return (
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-3 flex items-center"><Clock className="mr-2 h-4 w-4 text-primary" /> Saatlik Tahmin (Bugün)</h3>
        <div className="flex overflow-x-auto space-x-3 pb-3 -mb-3 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {weatherData.todayHourlyForecast.map((hourly: HourlyDetailType, index: number) => (
            <div key={index} className="flex-none w-28 p-3 border rounded-lg text-center bg-muted/30 hover:shadow-md transition-shadow">
              <p className="text-sm font-medium">{hourly.time}</p>
              <Image src={`https://openweathermap.org/img/wn/${hourly.icon}@2x.png`} alt={hourly.description || "saatlik hava"} width={48} height={48} className="mx-auto my-1" data-ai-hint="weather condition"/>
              <p className="text-lg font-bold">{hourly.temp}°</p>
              {hourly.pop > 0 && <p className="text-xs text-blue-600">Yağış: {hourly.pop}%</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDailyForecast = () => {
    if (!weatherData?.threeDaySummaryForecast || weatherData.threeDaySummaryForecast.length === 0) return (
        <p className="text-sm text-muted-foreground text-center py-4">Gelecek günler için tahmin bulunmuyor.</p>
    );
    return (
      <div>
        <h3 className="text-md font-semibold mb-3 flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" /> Gelecek 3 Gün</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {weatherData.threeDaySummaryForecast.map((daily: DailyForecastType, index: number) => (
            <div key={index} className="p-4 border rounded-lg bg-muted/30 hover:shadow-md transition-shadow text-center">
              <p className="text-base font-semibold">{daily.date}</p>
              <p className="text-xs text-muted-foreground mb-1">{daily.dayName}</p>
              <Image src={`https://openweathermap.org/img/wn/${daily.icon}@2x.png`} alt={daily.description || "günlük hava"} width={56} height={56} className="mx-auto my-1.5" data-ai-hint="weather condition"/>
              <p className="text-xl font-bold">{daily.maxTemp}° <span className="text-sm text-muted-foreground">/ {daily.minTemp}°</span></p>
              <p className="text-xs text-muted-foreground capitalize truncate mt-1" title={daily.description}>{daily.description}</p>
              {daily.precipitationChance > 10 && <p className="text-xs text-blue-600 mt-1">Yağış: {daily.precipitationChance}%</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };


  if (isLoading) {
    return (
      <Card className="shadow-lg w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {/* Skeleton for Current Weather */}
          <div className="p-4 rounded-lg bg-card/50 mb-4">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between">
              <div className="flex items-center mb-3 sm:mb-0">
                <Skeleton className="h-16 w-16 rounded-md" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-6 gap-y-2 text-sm">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          </div>
          <Separator className="my-4"/>
          {/* Skeleton for Hourly Forecast */}
          <div>
            <Skeleton className="h-6 w-40 mb-3" />
            <div className="flex space-x-3 pb-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="flex-none w-28 h-36 rounded-lg"/>)}
            </div>
          </div>
           <Separator className="my-4"/>
          {/* Skeleton for Daily Forecast */}
          <div>
            <Skeleton className="h-6 w-36 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-lg"/>)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg w-full border-destructive">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-xl font-headline flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" /> Hava Durumu Hatası
          </CardTitle>
           <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Tekrar dene">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-sm text-destructive-foreground bg-destructive/90 p-4 rounded-md">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData || (!weatherData.currentWeather && !weatherData.todayHourlyForecast && !weatherData.threeDaySummaryForecast)) {
     return (
      <Card className="shadow-lg w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-xl font-headline flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" /> {location.split(',')[0] || "Hava Durumu"}
          </CardTitle>
           <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Tekrar dene">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-sm text-muted-foreground text-center py-12">"{location.split(',')[0]}" için hava durumu verisi bulunamadı.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-xl font-headline flex items-center">
          <MapPin className="mr-2 h-5 w-5 text-primary" /> {weatherData.location?.split(',')[0] || location.split(',')[0] || "Hava Durumu"}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Hava durumunu yenile">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-2 space-y-5">
        {weatherData.currentWeather && renderCurrentWeather()}
        
        {(weatherData.currentWeather && (weatherData.todayHourlyForecast || weatherData.threeDaySummaryForecast)) && <Separator />}
        
        {weatherData.todayHourlyForecast && weatherData.todayHourlyForecast.length > 0 && renderHourlyForecast()}
        
        {((weatherData.currentWeather || weatherData.todayHourlyForecast) && weatherData.threeDaySummaryForecast) && <Separator />}
        
        {weatherData.threeDaySummaryForecast && weatherData.threeDaySummaryForecast.length > 0 && renderDailyForecast()}
      </CardContent>
    </Card>
  );
}

    