// src/components/dashboard/welcome-message.tsx
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { generateWelcomeMessage } from '@/ai/flows/ai-powered-welcome'; // Assuming this path is correct
import { Skeleton } from '@/components/ui/skeleton';

export function WelcomeMessage() {
  const { user } = useAuth();
  const [welcomeText, setWelcomeText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    setCurrentDate(now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  useEffect(() => {
    async function fetchWelcomeMessage() {
      if (user && currentTime && currentDate) {
        setLoading(true);
        try {
          // Placeholder values for pending tasks/projects
          const pendingTasks = 0; 
          const pendingProjects = 0;

          const result = await generateWelcomeMessage({
            userName: user.name,
            date: currentDate,
            time: currentTime,
            pendingTasks,
            pendingProjects,
          });
          setWelcomeText(result.message);
        } catch (error) {
          console.error("Yapay zeka karşılama mesajı oluşturulurken hata:", error);
          setWelcomeText(`Merhaba ${user.name}, hoş geldiniz! Bugün ${currentDate}, saat ${currentTime}.`);
        } finally {
          setLoading(false);
        }
      }
    }

    if (user && currentTime && currentDate) {
       fetchWelcomeMessage();
    } else if (!user) {
      setLoading(false); // Not logged in, not loading
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentTime, currentDate]); // Removed fetchWelcomeMessage from dependencies as it's defined inside

  if (!user) return null;


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Hoş Geldiniz!</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-lg">{welcomeText}</p>
        )}
      </CardContent>
    </Card>
  );
}
