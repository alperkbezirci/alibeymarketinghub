// src/components/dashboard/WelcomeDashboardSection.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, type User as AuthUser } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Briefcase, ListChecks, CalendarDays, ChevronRight } from 'lucide-react';
import { getProjectsByUserId, type Project } from '@/services/project-service';
import { getTasksByUserId, type Task } from '@/services/task-service';
import { getEvents, type CalendarEvent } from '@/services/calendar-service';
import { format, addDays, isBefore, parseISO, startOfToday, endOfDay, isValid } from 'date-fns';
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
    if (isOverdue && status !== 'Tamamlandı') return 'bg-red-500 hover:bg-red-600 text-white';
    if (!status) return 'bg-gray-500 hover:bg-gray-600 text-secondary-foreground';
    switch (status) {
      case 'Tamamlandı': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'Devam Ediyor': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'Planlama': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Beklemede': return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'İptal Edildi': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'Yapılacak': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Gözden Geçiriliyor': return 'bg-purple-500 hover:bg-purple-600 text-white';
      case 'Engellendi': return 'bg-red-600 hover:bg-red-700 text-white';
      default: return 'bg-gray-500 hover:bg-gray-600 text-secondary-foreground';
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
        getEvents(today, sevenDaysLater)
      ]);

      if (projectsResponse.status === 'fulfilled') {
        const userProjects = projectsResponse.value;
        const filteredOverdueProjects = userProjects
          .filter(p =>
            p.endDate && isValid(parseISO(p.endDate)) && isBefore(parseISO(p.endDate), today) &&
            p.status !== 'Tamamlandı' && p.status !== 'İptal Edildi'
          )
          .map(p => ({...p, isOverdue: true}))
          .sort((a, b) => {
            if (a.endDate && b.endDate) {
              return parseISO(a.endDate).getTime() - parseISO(b.endDate).getTime();
            }
            return 0;
          });
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
            if (!t.dueDate) return true;
            const dueDateObj = parseISO(t.dueDate);
            if (!isValid(dueDateObj)) return true; // Keep tasks with invalid due dates to be safe, or filter out
            return isBefore(dueDateObj, sevenDaysLater);
          })
          .map(t => ({
            ...t,
            isOverdue: t.dueDate && isValid(parseISO(t.dueDate)) ? isBefore(parseISO(t.dueDate), now) && t.status !== 'Tamamlandı' : false,
          }))
          .sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            if (a.dueDate && b.dueDate && isValid(parseISO(a.dueDate)) && isValid(parseISO(b.dueDate))) {
              return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
            }
            if (a.dueDate && isValid(parseISO(a.dueDate))) return -1;
            if (b.dueDate && isValid(parseISO(b.dueDate))) return 1;
            return 0;
          });
        setPendingTasks(filteredPendingTasks);
      } else {
        console.error("Error fetching tasks:", tasksResponse.reason);
        const reasonMessage = tasksResponse.reason instanceof Error ? tasksResponse.reason.message : String(tasksResponse.reason);
        setError(prev => prev ? prev + `\nGörevler yüklenemedi: ${reasonMessage}` : `Görevler yüklenemedi: ${reasonMessage}`);
      }

      if (eventsResponse.status === 'fulfilled') {
        setUpcomingEvents(
          eventsResponse.value.sort((a,b) => {
            const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : 0;
            const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : 0;
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
          })
        );
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

  const renderSimpleListItem = (
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

  const renderTaskItem = (task: EnrichedTask) => {
    let formattedDueDate = 'N/A';
    if (task.dueDate && isValid(parseISO(task.dueDate))) {
      formattedDueDate = format(parseISO(task.dueDate), 'dd MMM yy', { locale: tr });
    }

    return (
    <li key={task.id} className="mb-2">
      <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out bg-card/80 dark:bg-card/60">
        <CardContent className="p-3">
          <Link href={`/tasks/${task.id}`} className="group block">
            <div className="flex justify-between items-center mb-1">
              <p className={cn("font-semibold text-sm group-hover:text-primary truncate", task.isOverdue && task.status !== 'Tamamlandı' && "text-destructive")}>
                {task.taskName || "İsimsiz Görev"}
              </p>
              {task.isOverdue && task.status !== 'Tamamlandı' && <Badge variant="destructive" className="text-xs ml-2 shrink-0">GECİKMİŞ</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Bitiş: {formattedDueDate}
            </p>
            <div className="flex justify-between items-center mt-2">
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">{task.priority || 'Normal'}</Badge>
              <Badge className={cn("text-xs px-1.5 py-0.5", getStatusColor(task.status, task.isOverdue && task.status !== 'Tamamlandı'))}>
                {task.status || 'Bilinmiyor'}
              </Badge>
            </div>
          </Link>
        </CardContent>
      </Card>
    </li>
  )};


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
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
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
              {overdueProjects.map(p => {
                let formattedEndDate = 'N/A';
                if (p.endDate && isValid(parseISO(p.endDate))) {
                  formattedEndDate = format(parseISO(p.endDate), 'dd MMM yyyy', { locale: tr });
                }
                return renderSimpleListItem(
                  p.id,
                  p.projectName,
                  `Bitiş Tarihi: ${formattedEndDate} | Durum: ${p.status}`,
                  `/projects/${p.id}`,
                  true,
                  p.status
                );
              })}
            </ul>
          </div>
        )}

        {pendingTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-primary" /> Bekleyen ve Yaklaşan Görevleriniz
            </h3>
            <ul className="space-y-0">
              {pendingTasks.map(t => renderTaskItem(t))}
            </ul>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Yaklaşan Etkinlikler (Önümüzdeki 7 Gün)
            </h3>
            <ul className="space-y-1">
              {upcomingEvents.map(e => {
                let formattedStartDate = 'N/A';
                if (e.startDate && isValid(parseISO(e.startDate))) {
                  formattedStartDate = format(parseISO(e.startDate), 'dd MMM yyyy, HH:mm', { locale: tr });
                }
                return renderSimpleListItem(
                  e.id,
                  e.title,
                  `Başlangıç: ${formattedStartDate} ${e.eventType ? `| Tip: ${e.eventType}` : ''}`,
                  `/calendar`
                );
              })}
            </ul>
          </div>
        )}
        
        {overdueProjects.length === 0 && pendingTasks.length === 0 && upcomingEvents.length === 0 && !error && (
            <p className="text-md text-muted-foreground text-center py-6">Önümüzdeki 7 gün için planlanmış herhangi bir proje, görev veya etkinlik bulunmamaktadır. Harika bir hafta sizi bekliyor olabilir!</p>
        )}
      </CardContent>
    </Card>
  );
}
