
// src/components/dashboard/welcome-message.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { generateWelcomeMessage } from '@/ai/flows/ai-powered-welcome';
import { Skeleton } from '@/components/ui/skeleton';
import { getEvents, type CalendarEvent } from '@/services/calendar-service';
import { getProjectsByUserId, type Project } from '@/services/project-service'; // Assuming getProjectsByUserId exists
import { format, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';

export function WelcomeMessage() {
  const { user, getDisplayName } = useAuth();
  const [welcomeText, setWelcomeText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const [todaysEvents, setTodaysEvents] = useState<string[]>([]);
  const [userProjectsSummary, setUserProjectsSummary] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  const location = "Antalya, Türkiye"; // Hardcoded for now

  useEffect(() => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    setCurrentDate(now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  const fetchContextualData = useCallback(async () => {
    if (!user) {
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    try {
      // Fetch today's events
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const events: CalendarEvent[] = await getEvents(todayStart, todayEnd);
      setTodaysEvents(events.map(event => event.title).slice(0, 3)); // Max 3 events

      // Fetch user's projects
      const projects: Project[] = await getProjectsByUserId(user.uid);
      setUserProjectsSummary(
        projects.map(p => `${p.projectName || 'İsimsiz Proje'} (${p.status || 'Bilinmiyor'})`).slice(0, 3) // Max 3 projects
      );
    } catch (error) {
      console.error("Error fetching contextual data for welcome message:", error);
      // Set empty arrays on error so AI flow can handle it
      setTodaysEvents([]);
      setUserProjectsSummary([]);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchContextualData();
    }
  }, [user, fetchContextualData]);

  useEffect(() => {
    async function fetchWelcomeMessage() {
      if (user && currentTime && currentDate && !dataLoading) {
        setLoading(true);
        try {
          const result = await generateWelcomeMessage({
            userName: getDisplayName(),
            date: currentDate,
            time: currentTime,
            location: location,
            todaysEvents: todaysEvents,
            userProjectsSummary: userProjectsSummary,
          });
          setWelcomeText(result.message);
        } catch (error) {
          console.error("Yapay zeka karşılama mesajı oluşturulurken hata:", error);
          setWelcomeText(`Merhaba ${getDisplayName()}, Pazarlama Merkezi'ne hoş geldiniz! Bugün ${currentDate}, saat ${currentTime}. Harika bir gün geçirmenizi dileriz!`);
        } finally {
          setLoading(false);
        }
      }
    }

    if (user && currentTime && currentDate && !dataLoading) {
       fetchWelcomeMessage();
    } else if (!user) {
      setLoading(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentTime, currentDate, getDisplayName, dataLoading, todaysEvents, userProjectsSummary, location]);

  if (!user) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          <strong className="font-bold">Pazarlama</strong>Merkezi
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading || dataLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <p className="text-lg whitespace-pre-line">{welcomeText}</p>
        )}
      </CardContent>
    </Card>
  );
}
