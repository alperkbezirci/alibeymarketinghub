// src/components/dashboard/WelcomeDashboardSection.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, type User as AuthUser } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Briefcase, ListChecks, CalendarDays, ExternalLink, ChevronRight } from 'lucide-react';
import { getProjectsByUserId, type Project } from '@/services/project-service';
import { getTasksByUserId, type Task } from '@/services/task-service';
import { getEvents, type CalendarEvent } from '@/services/calendar-service';
import { format, addDays, isBefore, parseISO, startOfToday, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface WelcomeDashboardSectionProps {
  user: AuthUser;
}

interface EnrichedTask extends Task {
  isOverdue: boolean;
}

interface EnrichedProject extends Project {
    isOverdue: boolean;
}

const getStatusColor = (status?: string, isOverdue?: boolean) => {
    if (isOverdue) return 'bg-red-500 hover:bg-red-600 text-white';
    if (!status) return 'bg-gray-500 hover:bg-gray-600';
    switch (status) {
      case 'Tamamlandı': return 'bg-green-500 hover:bg-green-600';
      case 'Devam Ediyor': return 'bg-blue-500 hover:bg-blue-600';
      case 'Planlama': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Beklemede': return 'bg-orange-500 hover:bg-orange-600';
      case 'İptal Edildi': return 'bg-red-500 hover:bg-red-600';
      case 'Yapılacak': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Gözden Geçiriliyor': return 'bg-purple-500 hover:bg-purple-600';
      case 'Engellendi': return 'bg-red-600 hover:bg-red-700';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
};

export function WelcomeDashboardSection({ user }: WelcomeDashboardSectionProps) {
  const [overdueProjects, setOverdueProjects] = useState<EnrichedProject[]>([]);
  const [pendingTasks, setPendingTasks] = useState<EnrichedTask[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const today = startOfToday();
    const sevenDaysLater = endOfDay(addDays(today, 7));

    try {
      const [projectsResponse, tasksResponse, eventsResponse] = await Promise.allSettled([
        getProjectsByUserId(user.uid),
        getTasksByUserId(user.uid),
        getEvents(today, sevenDaysLater) // Fetch events for the next 7 days
      ]);

      if (projectsResponse.status === 'fulfilled') {
        const userProjects = projectsResponse.value;
        const filteredOverdueProjects = userProjects
          .filter(p =>
            p.endDate && isBefore(parseISO(p.endDate), today) &&
            p.status !== 'Tamamlandı' && p.status !== 'İptal Edildi'
          )
          .map(p => ({...p, isOverdue: true}))
          .sort((a, b) => parseISO(a.endDate!).getTime() - parseISO(b.endDate!).getTime()); // Sort by oldest overdue
        setOverdueProjects(filteredOverdueProjects);
      } else {
        console.error("Error fetching projects:", projectsResponse.reason);
        setError(prev => prev ? prev + "\nProjeler yüklenemedi." : "Projeler yüklenemedi.");
      }

      if (tasksResponse.status === 'fulfilled') {
        const userTasks = tasksResponse.value;
        const now = new Date();
        const filteredPendingTasks = userTasks
          .filter(t => {
            if (t.status === 'Tamamlandı') return false;
            if (!t.dueDate) return true; // Include tasks without due dates as pending
            const dueDate = parseISO(t.dueDate);
            return isBefore(dueDate, sevenDaysLater); // Overdue or due in next 7 days
          })
          .map(t => ({
            ...t,
            isOverdue: t.dueDate ? isBefore(parseISO(t.dueDate), now) && t.status !== 'Tamamlandı' : false,
          }))
          .sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            if (a.dueDate && b.dueDate) return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
            if (a.dueDate) return -1; // Tasks with due dates first
            if (b.dueDate) return 1;
            return 0;
          });
        setPendingTasks(filteredPendingTasks);
      } else {
        console.error("Error fetching tasks:", tasksResponse.reason);
        setError(prev => prev ? prev + "\nGörevler yüklenemedi." : "Görevler yüklenemedi.");
      }

      if (eventsResponse.status === 'fulfilled') {
        setUpcomingEvents(eventsResponse.value.sort((a,b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()));
      } else {
        console.error("Error fetching events:", eventsResponse.reason);
        setError(prev => prev ? prev + "\nEtkinlikler yüklenemedi." : "Etkinlikler yüklenemedi.");
      }

    } catch (e: any) {
      console.error("General error fetching dashboard welcome data:", e);
      setError("Hoş geldin verileri yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderListItem = (
    id: string,
    title: string | undefined,
    detail: string,
    href: string,
    isOverdue?: boolean,
    status?: string,
  ) => (
    <li key={id} className="border-b last:border-b-0 py-2.5 hover:bg-muted/30 px-1 -mx-1 rounded-md transition-colors">
      <Link href={href} className="flex items-center justify-between group">
        <div>
          <p className={cn("font-medium group-hover:text-primary", isOverdue && "text-destructive")}>
            {title || "İsimsiz"}
            {isOverdue && <Badge variant="destructive" className="ml-2 text-xs">GECİKMİŞ</Badge>}
            {status && !isOverdue && <Badge variant="secondary" className={cn("ml-2 text-xs", getStatusColor(status))}>{status}</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </Link>
    </li>
  );

  if (isLoading) {
    return (
      <Card className="shadow-lg w-full">
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Hoş Geldin, {user.firstName || 'Kullanıcı'}!</CardTitle>
        <CardDescription>İşte önümüzdeki 7 gün için çalışma planınıza dair bir özet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="text-destructive bg-destructive/10 p-3 rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p className="text-sm whitespace-pre-line">{error}</p>
          </div>
        )}

        {overdueProjects.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center text-destructive">
              <Briefcase className="mr-2 h-5 w-5" /> Gecikmiş Projeleriniz (En Öncelikli)
            </h3>
            <ul className="space-y-1">
              {overdueProjects.map(p => renderListItem(
                p.id,
                p.projectName,
                `Bitiş Tarihi: ${p.endDate ? format(parseISO(p.endDate), 'dd MMM yyyy', { locale: tr }) : 'N/A'} | Durum: ${p.status}`,
                `/projects/${p.id}`,
                true,
                p.status
              ))}
            </ul>
          </div>
        )}

        {pendingTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-primary" /> Bekleyen ve Yaklaşan Görevleriniz
            </h3>
            <ul className="space-y-1">
              {pendingTasks.map(t => renderListItem(
                t.id,
                t.taskName,
                `Bitiş Tarihi: ${t.dueDate ? format(parseISO(t.dueDate), 'dd MMM yyyy', { locale: tr }) : 'N/A'} | Öncelik: ${t.priority}`,
                `/tasks/${t.id}`,
                t.isOverdue,
                t.status
              ))}
            </ul>
          </div>
        )}
        {pendingTasks.length === 0 && !overdueProjects.length && !error && (
             <p className="text-sm text-muted-foreground py-2 text-center">Yaklaşan veya gecikmiş göreviniz/projeniz bulunmuyor.</p>
        )}

        {upcomingEvents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Yaklaşan Etkinlikler (Önümüzdeki 7 Gün)
            </h3>
            <ul className="space-y-1">
              {upcomingEvents.map(e => renderListItem(
                e.id,
                e.title,
                `Başlangıç: ${format(parseISO(e.startDate), 'dd MMM yyyy, HH:mm', { locale: tr })} ${e.eventType ? `| Tip: ${e.eventType}` : ''}`,
                `/calendar` // Event detail page doesn't exist, link to general calendar
              ))}
            </ul>
          </div>
        )}
        {upcomingEvents.length === 0 && !error && (
             <p className="text-sm text-muted-foreground py-2 text-center">Önümüzdeki 7 gün için planlanmış bir etkinlik bulunmuyor.</p>
        )}
         {overdueProjects.length === 0 && pendingTasks.length === 0 && upcomingEvents.length === 0 && !error && (
            <p className="text-md text-muted-foreground text-center py-6">Önümüzdeki 7 gün için planlanmış herhangi bir proje, görev veya etkinlik bulunmamaktadır. Harika bir hafta sizi bekliyor olabilir!</p>
        )}
      </CardContent>
    </Card>
  );
}

    