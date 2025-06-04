// src/components/dashboard/weather-widget.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card"; // CardHeader, CardTitle kaldırıldı
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CloudOff, RefreshCw, MapPin } from 'lucide-react'; // Kullanılmayan ikonlar kaldırıldı
import { getWeatherForecast } from '@/ai/flows/weather-forecast-flow';
import type { WeatherInfoOutput } from '@/ai/schemas/weather-schemas';
import { useToast } from '@/hooks/use-toast';
// import { cn } from '@/lib/utils'; // cn kullanımı kalmadıysa silinebilir

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
          userErrorMessage = "Hava durumu servisi için API anahtarı yapılandırılmamış.";
        } else if (data.error.toLowerCase().includes("not found") || data.error.includes("404")) {
          userErrorMessage = `Konum (${location}) bulunamadı.`;
        } else if (data.error.toLowerCase().includes("invalid api key")) {
          userErrorMessage = "Geçersiz API anahtarı.";
        }
        setError(userErrorMessage);
        setWeatherData(null);
        // toast({ title: "Hava Durumu Hatası", description: userErrorMessage, variant: "destructive" });
      } else if (!data.currentWeather) { // Sadece currentWeather kontrolü yeterli
        setError("Güncel hava durumu verisi alınamadı.");
        setWeatherData(null);
        // toast({ title: "Veri Yok", description: "Güncel hava durumu verisi bulunamadı.", variant: "default" });
      } else {
        setWeatherData(data);
      }
    } catch (err: any) {
      setError(err.message || "Hava durumu yüklenirken bir hata oluştu.");
      setWeatherData(null);
      // toast({ title: "Yükleme Hatası", description: err.message || "Hava durumu yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [location, toast]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  if (isLoading) {
    return (
      <Card className="shadow-sm w-full">
        <CardContent className="p-2 sm:p-2.5">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Skeleton className="h-5 w-16 sm:w-20" /> {/* Location */}
            <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-md" /> {/* Icon */}
            <Skeleton className="h-6 w-10 sm:w-12" /> {/* Temp */}
            <Skeleton className="h-5 w-20 sm:w-24 flex-1" /> {/* Description */}
            <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-md ml-auto" /> {/* Refresh Button */}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm border-destructive w-full">
        <CardContent className="p-2 sm:p-2.5">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center text-destructive text-xs sm:text-sm">
              <AlertTriangle className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate" title={error}>{error}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Hava durumunu yenile" className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData || !weatherData.currentWeather) {
    return (
      <Card className="shadow-sm w-full">
        <CardContent className="p-2 sm:p-2.5">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center text-muted-foreground text-xs sm:text-sm">
                <CloudOff className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">"{location.split(',')[0]}" için veri yok.</span>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Hava durumunu yenile" className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { currentWeather } = weatherData;
  const displayLocation = weatherData.location?.split(',')[0] || location.split(',')[0];

  return (
    <Card className="shadow-sm w-full overflow-hidden">
      <CardContent className="p-2 sm:p-2.5">
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm">
          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-muted-foreground whitespace-nowrap truncate" title={displayLocation}>
            {displayLocation}
          </span>

          {currentWeather.icon && (
            <Image
              src={`https://openweathermap.org/img/wn/${currentWeather.icon}.png`}
              alt={currentWeather.description || "Hava durumu"}
              width={28} // Daha küçük ikon
              height={28}
              className="flex-shrink-0"
              data-ai-hint="weather condition"
            />
          )}
          <span className="text-sm sm:text-base font-bold text-primary whitespace-nowrap">{currentWeather.temp}°C</span>
          <span className="text-muted-foreground capitalize truncate hidden md:inline" title={currentWeather.description}>
            {currentWeather.description}
          </span>
          
          <div className="flex-grow min-w-[8px]"></div> {/* Esnek boşluk */}

          <Button variant="ghost" size="icon" onClick={fetchWeather} aria-label="Hava durumunu yenile" className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0">
            <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
