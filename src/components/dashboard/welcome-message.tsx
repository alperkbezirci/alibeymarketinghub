
// src/components/dashboard/welcome-message.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { getWeatherForecast, type WeatherInfoOutput } from '@/ai/flows/weather-forecast-flow';
// generateMotivationalMessage artık SuperSimpleInput ve SuperSimpleOutput kullanacak
import { generateMotivationalMessage, type SuperSimpleInput, type SuperSimpleOutput } from '@/ai/flows/ai-motivational-message';
// getEvents ve getTasks artık bu sadeleştirilmiş versiyonda kullanılmıyor.
// import { getEvents, type CalendarEvent } from '@/services/calendar-service';
// import { getActiveTasks, getOverdueTasks, type Task } from '@/services/task-service';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MapPin, Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, Cloudy, Thermometer, Droplets, Wind, Sparkles, Loader2, Info } from 'lucide-react';

const getWeatherIcon = (iconCode?: string, size: number = 24) => {
  if (!iconCode) return <Cloudy size={size} className="text-muted-foreground" />;
  if (iconCode.startsWith("01")) return <Sun size={size} className="text-yellow-500" />;
  if (iconCode.startsWith("02")) return <CloudSun size={size} className="text-yellow-400" />;
  if (iconCode.startsWith("03")) return <Cloud size={size} className="text-sky-400" />;
  if (iconCode.startsWith("04")) return <Cloudy size={size} className="text-sky-500" />;
  if (iconCode.startsWith("09")) return <CloudRain size={size} className="text-blue-500" />;
  if (iconCode.startsWith("10")) return <CloudRain size={size} className="text-blue-600" />;
  if (iconCode.startsWith("11")) return <CloudLightning size={size} className="text-purple-500" />;
  if (iconCode.startsWith("13")) return <CloudSnow size={size} className="text-blue-300" />;
  return <Cloudy size={size} className="text-muted-foreground" />;
};

export function WelcomeMessage() {
  const { user } = useAuth();
  
  const [weatherData, setWeatherData] = useState<WeatherInfoOutput | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);
  const [aiMotivationalText, setAiMotivationalText] = useState<string | null>(null);
  const [loadingAiMessage, setLoadingAiMessage] = useState<boolean>(true);

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateShort, setCurrentDateShort] = useState<string>('');

  const location = "Antalya, Türkiye"; 

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDateShort(format(now, 'd MMMM yyyy', {locale: tr}));
    };
    updateDateTime(); 
    const timerId = setInterval(updateDateTime, 60000); 
    return () => clearInterval(timerId); 
  }, []);

  const fetchAndSetWeatherData = useCallback(async () => {
    setLoadingWeather(true);
    try {
        const result = await getWeatherForecast({ location });
        setWeatherData(result);
        // Hava durumu bilgisini AI mesajı için artık doğrudan kullanmıyoruz (bu süper basit versiyonda)
    } catch (error: any) {
        console.error("Hava durumu verisi alınırken hata (bileşen):", error);
        const errorResult = { location, error: "Hava durumu bilgisi şu anda alınamıyor. (Kod: WC_ERR_FETCH)" };
        setWeatherData(errorResult);
    } finally {
        setLoadingWeather(false);
    }
  }, [location]);

  const fetchAndSetAiMessage = useCallback(async () => {
    if (!user) return;
    setLoadingAiMessage(true);
    setAiMotivationalText(null);

    // Süper basit versiyon için sadece kullanıcı adını gönderiyoruz.
    const simpleInput: SuperSimpleInput = {
      userName: user.firstName,
    };

    console.log('[WelcomeMessage - Super Simple] Calling generateMotivationalMessage with input:', JSON.stringify(simpleInput));

    try {
      const aiResult: SuperSimpleOutput = await generateMotivationalMessage(simpleInput);

      if (aiResult.message) {
        setAiMotivationalText(aiResult.message);
        console.log('[WelcomeMessage - Super Simple] AI Message received:', aiResult.message);
      } else {
        setAiMotivationalText(`Güne harika bir başlangıç yap, ${user.firstName}! (Varsayılan Mesaj - Çıktı Yok - Süper Basit)`);
        console.warn('[WelcomeMessage - Super Simple] AI returned no message.');
      }
    } catch (aiError: any) {
      console.error("[WelcomeMessage - Super Simple] Error generating AI motivational message:", aiError.message, aiError);
      setAiMotivationalText(`Bugün senin günün, ${user.firstName}! (AI Akış Hatası - Süper Basit - ${aiError.message.substring(0,50)}...)`);
    } finally {
      setLoadingAiMessage(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAndSetWeatherData(); // Hava durumunu yine de alalım, UI'da gösterilecek
      fetchAndSetAiMessage();   // AI mesajını alalım (artık hava durumu bilgisini beklemiyor)
    }
  }, [user, fetchAndSetWeatherData, fetchAndSetAiMessage]);


  if (!user) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <span>Merhaba {user.firstName},</span>
          <div className="text-sm font-normal text-muted-foreground mt-1 sm:mt-0 flex items-center">
            <MapPin size={16} className="mr-1.5" /> {location} <span className="mx-1.5">•</span> {currentDateShort}, {currentTime}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingAiMessage && (
          <div className="flex items-center text-sm text-muted-foreground py-3">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Sana özel bir mesaj hazırlanıyor... (Süper Basit Mod)</span>
          </div>
        )}
        {!loadingAiMessage && aiMotivationalText && (
          <div className="py-3 mb-4 border-b border-dashed">
            <p className="text-base italic text-foreground/90 flex items-start">
              <Sparkles className="mr-2 h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>{aiMotivationalText}</span>
            </p>
          </div>
        )}
         {!loadingAiMessage && !aiMotivationalText && (
           <div className="flex items-center text-sm text-muted-foreground py-3">
             <Info className="mr-2 h-4 w-4" />
            <span>Sana özel mesaj yüklenemedi. (Süper Basit Mod)</span>
          </div>
        )}
        
        {loadingWeather && !weatherData && (
           <div className="mt-2 space-y-3">
                <Skeleton className="h-8 w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
            </div>
        )}

        {!loadingWeather && weatherData && !weatherData.error && weatherData.currentWeather && (
          <div className="mt-2 pt-0">
            <div className="flex items-center mb-3">
              {getWeatherIcon(weatherData.currentWeather.icon, 32)}
              <div className="ml-3">
                <p className="text-2xl font-semibold">{weatherData.currentWeather.temp}°C</p>
                <p className="text-sm text-muted-foreground capitalize">{weatherData.currentWeather.description}</p>
              </div>
              <div className="ml-auto text-xs text-muted-foreground space-y-0.5 text-right">
                <p className="flex items-center justify-end"><Thermometer size={12} className="mr-1" /> Hissedilen: {weatherData.currentWeather.feelsLike}°C</p>
                <p className="flex items-center justify-end"><Droplets size={12} className="mr-1" /> Nem: %{weatherData.currentWeather.humidity}</p>
                <p className="flex items-center justify-end"><Wind size={12} className="mr-1" /> Rüzgar: {weatherData.currentWeather.windSpeed} m/s</p>
              </div>
            </div>

            {weatherData.todayHourlyForecast && weatherData.todayHourlyForecast.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1 mt-3">Bugün Saatlik Tahmin</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {weatherData.todayHourlyForecast.slice(0,4).map((hour, index) => ( 
                    <div key={index} className="p-2 bg-muted/20 rounded flex items-center justify-between">
                      <div>
                        <p className="font-medium">{hour.time}</p>
                        <p className="text-muted-foreground capitalize">{hour.description.substring(0,15)}</p>
                         {hour.pop > 10 && <p className="text-blue-600 dark:text-blue-400">Yağış: %{hour.pop}</p>}
                      </div>
                      <div className="flex flex-col items-center">
                        {getWeatherIcon(hour.icon, 20)}
                        <p className="font-semibold">{hour.temp}°</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}


            {weatherData.threeDaySummaryForecast && weatherData.threeDaySummaryForecast.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 mt-4">Gelecek 3 Gün</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {weatherData.threeDaySummaryForecast.map((day, index) => (
                    <Card key={index} className="p-3 bg-muted/30">
                      <p className="text-sm font-semibold text-center mb-1">{day.date}</p>
                      <div className="flex flex-col items-center">
                        {getWeatherIcon(day.icon, 28)}
                        <p className="text-lg font-bold mt-1">{day.maxTemp}°<span className="text-sm font-normal text-muted-foreground">/{day.minTemp}°</span></p>
                        <p className="text-xs text-muted-foreground capitalize text-center mt-0.5">{day.description}</p>
                         {day.precipitationChance > 10 && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Yağış: %{day.precipitationChance}</p>}
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {!loadingWeather && weatherData?.error && (
            <p className="text-sm text-destructive mt-4 text-center">{weatherData.error} (Kod: WC_DISPLAY_ERR)</p>
        )}
        {!loadingWeather && !weatherData?.currentWeather && !weatherData?.error && !weatherData?.todayHourlyForecast && (
          <p className="text-sm text-muted-foreground mt-4 text-center">Güne dair hava durumu bilgisi yüklenemedi.</p>
        )}
      </CardContent>
    </Card>
  );
}
