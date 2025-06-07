// src/components/dashboard/weather-widget.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton'; // Assuming Loader2 is intended to be imported from here
import { AlertTriangle, Thermometer, Droplets, Wind, CalendarDays, Clock, RefreshCw, MapPin } from 'lucide-react';
import { getWeatherForecast } from '@/ai/flows/weather-forecast-flow';
import type { WeatherInfoOutput, DailyForecastSchema as DailyForecastType, HourlyDetailSchema as HourlyDetailType } from '@/ai/schemas/weather-schemas';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const DEFAULT_LOCATION = "Side, Türkiye";
const Loader2 = () => <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />; // Simple Loader2 representation if not in skeleton

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
    } catch (err: Error) {
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
    if (!weatherData?.currentWeather) return null; // Return null if no current weather to avoid empty space
    const { temp, description, icon, feelsLike, humidity, windSpeed } = weatherData.currentWeather;
    return (
      <div className="mb-3 rounded-lg">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center">
            <Image src={`https://openweathermap.org/img/wn/${icon}@2x.png`} alt={description || "Hava durumu"} width={60} height={60} data-ai-hint="weather condition" className="flex-shrink-0"/>
            <div className="ml-3">
              <p className="text-4xl font-bold text-primary">{temp}°C</p>
              <p className="text-sm text-muted-foreground capitalize">{description}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs sm:text-sm text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center">
              <Thermometer className="mr-0 sm:mr-1 h-4 w-4 text-muted-foreground mb-1 sm:mb-0" /> Hiss.: {feelsLike}°C
            </div>
            <div className="flex flex-col sm:flex-row items-center">
              <Droplets className="mr-0 sm:mr-1 h-4 w-4 text-muted-foreground mb-1 sm:mb-0" /> Nem: {humidity}%
            </div>
            <div className="flex flex-col sm:flex-row items-center">
              <Wind className="mr-0 sm:mr-1 h-4 w-4 text-muted-foreground mb-1 sm:mb-0" /> Rüzgar: {windSpeed}m/s
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHourlyForecast = () => {
    if (!weatherData?.todayHourlyForecast || weatherData.todayHourlyForecast.length === 0) return null;
    return (
      <div className="w-full">
        <h3 className="text-base font-semibold mb-2 flex items-center"><Clock className="mr-2 h-4 w-4 text-primary" /> Saatlik Tahmin</h3>
        <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {weatherData.todayHourlyForecast.map((hourly: HourlyDetailType, index: number) => (
            <div key={index} className="flex-none w-24 p-2 border rounded-lg text-center bg-muted/40 hover:shadow-sm transition-shadow">
              <p className="text-xs font-medium">{hourly.time}</p>
              <Image src={`https://openweathermap.org/img/wn/${hourly.icon}.png`} alt={hourly.description || "saatlik hava"} width={40} height={40} className="mx-auto" data-ai-hint="weather condition"/>
              <p className="text-md font-bold">{hourly.temp}°</p>
              {hourly.pop > 5 && <p className="text-xs text-blue-500">%{hourly.pop}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDailyForecast = () => {
    if (!weatherData?.threeDaySummaryForecast || weatherData.threeDaySummaryForecast.length === 0) return null;
    return (
      <div className="w-full">
        <h3 className="text-base font-semibold mb-2 flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" /> 3 Günlük Tahmin</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {weatherData.threeDaySummaryForecast.map((daily: DailyForecastType, index: number) => (
            <div key={index} className="p-3 border rounded-lg bg-muted/40 hover:shadow-sm transition-shadow text-center">
              <p className="text-sm font-semibold">{daily.date}</p>
              <p className="text-xs text-muted-foreground mb-0.5 truncate" title={daily.dayName}>{daily.dayName.split(',')[0]}</p>
              <Image src={`https://openweathermap.org/img/wn/${daily.icon}.png`} alt={daily.description || "günlük hava"} width={48} height={48} className="mx-auto" data-ai-hint="weather condition"/>
              <p className="text-lg font-bold">{daily.maxTemp}°<span className="text-xs text-muted-foreground">/{daily.minTemp}°</span></p>
              <p className="text-xs text-muted-foreground capitalize truncate" title={daily.description}>{daily.description}</p>
              {daily.precipitationChance > 10 && <p className="text-xs text-blue-500 mt-0.5">Yağış: %{daily.precipitationChance}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };


  if (isLoading) {
    return (
      <Card className="shadow-lg w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
           <div className="flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent className="pt-2 pb-3 px-4 space-y-3">
          <div className="mb-2">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center">
                <Skeleton className="h-14 w-14 rounded-md" />
                <div className="ml-3 space-y-1">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-x-2 text-xs">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
          <Separator/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Skeleton className="h-5 w-32 mb-2" />
              <div className="flex space-x-2">
                {[1,2,3].map(i => <Skeleton key={i} className="flex-none w-24 h-28 rounded-lg"/>)}
              </div>
            </div>
            <div>
              <Skeleton className="h-5 w-28 mb-2" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-lg"/>)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg w-full border-destructive">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
          <CardTitle className="text-lg font-headline flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" /> Hava Durumu Hatası
          </CardTitle>
           <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Tekrar dene">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-2 pb-3 px-4">
          <p className="text-sm text-destructive-foreground bg-destructive/90 p-3 rounded-md">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData || (!weatherData.currentWeather && (!weatherData.todayHourlyForecast || weatherData.todayHourlyForecast.length === 0) && (!weatherData.threeDaySummaryForecast || weatherData.threeDaySummaryForecast.length === 0))) {
     return (
      <Card className="shadow-lg w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
          <CardTitle className="text-lg font-headline flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" /> {location.split(',')[0] || "Hava Durumu"}
          </CardTitle>
           <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Tekrar dene">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-2 pb-3 px-4">
          <p className="text-sm text-muted-foreground text-center py-10">"{location.split(',')[0]}" için hava durumu verisi bulunamadı.</p>
        </CardContent>
      </Card>
    );
  }
  
  const hourlyForecastComponent = renderHourlyForecast();
  const dailyForecastComponent = renderDailyForecast();

  return (
    <Card className="shadow-lg w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
        <CardTitle className="text-lg font-headline flex items-center">
          <MapPin className="mr-2 h-5 w-5 text-primary" /> {weatherData.location?.split(',')[0] || location.split(',')[0] || "Hava Durumu"}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Hava durumunu yenile" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button> // Added closing tag for Button
      </CardHeader>
      <CardContent className="pt-2 pb-3 px-4 space-y-4">
        {renderCurrentWeather()}
        
        {(weatherData.currentWeather && (hourlyForecastComponent || dailyForecastComponent)) && <Separator />}
        
        {(hourlyForecastComponent || dailyForecastComponent) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hourlyForecastComponent}
            {dailyForecastComponent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
