
// src/components/dashboard/welcome-message.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { generateWelcomeMessage } from '@/ai/flows/ai-powered-welcome';
import { getWeatherForecast, type WeatherInfoOutput } from '@/ai/flows/weather-forecast-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { getEvents, type CalendarEvent } from '@/services/calendar-service';
import { getProjectsByUserId, type Project } from '@/services/project-service';
import { format, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MapPin, Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, Cloudy, Thermometer, Droplets, Wind, CalendarClock, Briefcase } from 'lucide-react';

const getWeatherIcon = (iconCode?: string, size: number = 24) => {
  if (!iconCode) return <Cloudy size={size} className="text-muted-foreground" />;
  // Mapping OpenWeatherMap icon codes to Lucide icons
  // See: https://openweathermap.org/weather-conditions
  if (iconCode.startsWith("01")) return <Sun size={size} className="text-yellow-500" />; // clear sky
  if (iconCode.startsWith("02")) return <CloudSun size={size} className="text-yellow-400" />; // few clouds
  if (iconCode.startsWith("03")) return <Cloud size={size} className="text-sky-400" />; // scattered clouds
  if (iconCode.startsWith("04")) return <Cloudy size={size} className="text-sky-500" />; // broken clouds, overcast clouds
  if (iconCode.startsWith("09")) return <CloudRain size={size} className="text-blue-500" />; // shower rain
  if (iconCode.startsWith("10")) return <CloudRain size={size} className="text-blue-600" />; // rain
  if (iconCode.startsWith("11")) return <CloudLightning size={size} className="text-purple-500" />; // thunderstorm
  if (iconCode.startsWith("13")) return <CloudSnow size={size} className="text-blue-300" />; // snow
  return <Cloudy size={size} className="text-muted-foreground" />; // default
};


export function WelcomeMessage() {
  const { user, getDisplayName } = useAuth();
  const [aiWelcomeText, setAiWelcomeText] = useState<string>('');
  const [loadingAiMessage, setLoadingAiMessage] = useState<boolean>(true);
  
  const [weatherData, setWeatherData] = useState<WeatherInfoOutput | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFull, setCurrentDateFull] = useState<string>(''); // For potential use in UI if AI fails grandly
  const [currentDateShort, setCurrentDateShort] = useState<string>(''); // For display

  const [todaysEvents, setTodaysEvents] = useState<string[]>([]);
  const [userProjectsSummary, setUserProjectsSummary] = useState<string[]>([]);
  const [loadingContextualData, setLoadingContextualData] = useState<boolean>(true);

  const location = "Antalya, Türkiye"; // Hardcoded for now

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDateFull(now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
      setCurrentDateShort(format(now, 'd MMMM yyyy', {locale: tr}));
    };
    updateDateTime();
    const timerId = setInterval(updateDateTime, 60000); // Update time every minute
    return () => clearInterval(timerId);
  }, []);

  const fetchContextualDataForAI = useCallback(async () => {
    if (!user) {
      setLoadingContextualData(false);
      return;
    }
    setLoadingContextualData(true);
    try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const events: CalendarEvent[] = await getEvents(todayStart, todayEnd);
      setTodaysEvents(events.map(event => event.title).slice(0, 3));

      const projects: Project[] = await getProjectsByUserId(user.uid);
      setUserProjectsSummary(
        projects.map(p => `${p.projectName || 'İsimsiz Proje'} (${p.status || 'Bilinmiyor'})`).slice(0, 3)
      );
    } catch (error) {
      console.error("Error fetching contextual data for AI welcome message:", error);
      setTodaysEvents([]);
      setUserProjectsSummary([]);
    } finally {
      setLoadingContextualData(false);
    }
  }, [user]);

  const fetchWeatherDetails = useCallback(async () => {
    setLoadingWeather(true);
    try {
        const result = await getWeatherForecast({ location });
        setWeatherData(result);
    } catch (error) {
        console.error("Hava durumu verisi alınırken hata (bileşen):", error);
        setWeatherData({ location, error: "Hava durumu bilgisi şu anda alınamıyor." } as WeatherInfoOutput);
    } finally {
        setLoadingWeather(false);
    }
  }, [location]);


  useEffect(() => {
    if (user) {
      fetchContextualDataForAI();
      fetchWeatherDetails();
    }
  }, [user, fetchContextualDataForAI, fetchWeatherDetails]);

  useEffect(() => {
    async function fetchAiWelcomeMessageInternal() {
      if (user && !loadingContextualData) { 
        setLoadingAiMessage(true);
        try {
          const result = await generateWelcomeMessage({
            userName: getDisplayName(),
            todaysEvents: todaysEvents,
            userProjectsSummary: userProjectsSummary,
          });
          setAiWelcomeText(result.message);
        } catch (error: any) { 
          console.error("[WelcomeMessage Component] Error calling generateWelcomeMessage:", error.message, error.stack, error);
          // This is the ultimate fallback if generateWelcomeMessage itself throws an unhandled error
          setAiWelcomeText(`Merhaba ${getDisplayName()}, Pazarlama Merkezi'ne hoş geldiniz! Bugün ${currentDateFull}, saat ${currentTime}. Üzgünüz, size özel bir mesaj şu anda oluşturulamıyor, ancak harika bir gün dileriz! (Kod: WC_CATCH)`);
        } finally {
          setLoadingAiMessage(false);
        }
      }
    }

    if (user && !loadingContextualData) { 
       fetchAiWelcomeMessageInternal();
    } else if (!user) {
      setLoadingAiMessage(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, getDisplayName, loadingContextualData, todaysEvents, userProjectsSummary]); // Removed currentDateFull, currentTime from deps as AI flow no longer uses them

  if (!user) return null;

  const isLoading = loadingAiMessage || loadingWeather || loadingContextualData;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <span><strong className="font-bold">Pazarlama</strong>Merkezi</span>
          <div className="text-sm font-normal text-muted-foreground mt-1 sm:mt-0 flex items-center">
            <MapPin size={16} className="mr-1.5" /> {location} <span className="mx-1.5">•</span> {currentDateShort}, {currentTime}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full mt-1" />
          </div>
        ) : (
          <p className="text-lg whitespace-pre-line leading-relaxed">{aiWelcomeText}</p>
        )}
        
        {loadingWeather && !weatherData && (
           <div className="mt-6 space-y-3">
                <Skeleton className="h-8 w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
            </div>
        )}

        {!loadingWeather && weatherData && !weatherData.error && weatherData.currentWeather && (
          <div className="mt-6 pt-4 border-t">
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
            <p className="text-sm text-destructive mt-4 text-center">{weatherData.error}</p>
        )}
      </CardContent>
      {(todaysEvents.length > 0 || userProjectsSummary.length > 0) && !isLoading && (
         <CardFooter className="flex flex-col sm:flex-row gap-4 pt-4 border-t text-xs text-muted-foreground">
            {todaysEvents.length > 0 && (
                <div className="flex-1">
                    <p className="font-semibold mb-1 flex items-center"><CalendarClock size={14} className="mr-1.5"/> Bugünün Etkinlikleri:</p>
                    <ul className="list-disc list-inside pl-1 space-y-0.5">
                        {todaysEvents.map((event, idx) => <li key={idx} className="truncate" title={event}>{event}</li>)}
                    </ul>
                </div>
            )}
            {userProjectsSummary.length > 0 && (
                 <div className="flex-1">
                    <p className="font-semibold mb-1 flex items-center"><Briefcase size={14} className="mr-1.5"/> Projelerim:</p>
                     <ul className="list-disc list-inside pl-1 space-y-0.5">
                        {userProjectsSummary.map((project, idx) => <li key={idx} className="truncate" title={project}>{project}</li>)}
                    </ul>
                </div>
            )}
        </CardFooter>
      )}
    </Card>
  );
}

