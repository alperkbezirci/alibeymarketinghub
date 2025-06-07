
// src/app/(app)/tasks/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTaskById, type Task } from '@/services/task-service';
import { getProjectById, type Project } from '@/services/project-service';
import { getAllUsers, type User as AppUser } from '@/services/user-service';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { Button } from "@/components/ui/button";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Edit, CalendarDays, Info, Hotel, Briefcase, UserCheck, Tag, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { GlobalLoader } from '@/components/layout/global-loader';
import { AppLogo } from '@/components/layout/app-logo';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const taskId = typeof params.id === 'string' ? params.id : undefined;

  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [isLoadingProject, setIsLoadingProject] = useState(false); // Only load if project ID exists
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) {
      setError("Görev ID'si bulunamadı.");
      setIsLoadingTask(false);
      return;
    }
    setIsLoadingTask(true);
    setError(null);
    try {
      const fetchedTask = await getTaskById(taskId);
      setTask(fetchedTask);

      if (fetchedTask?.project) {
        setIsLoadingProject(true);
        const fetchedProject = await getProjectById(fetchedTask.project);
        setProject(fetchedProject);
        setIsLoadingProject(false);
      }
      
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);

    } catch (err: unknown) {
      console.error("Error fetching task details:", err); // Log the original error
 let errorMessage = `Görev (ID: ${taskId}) detayları yüklenirken bir hata oluştu.`;
 if (err instanceof Error) {
 errorMessage = err.message;
 }
      setError(errorMessage);
      toast({ title: "Görev Yükleme Hatası", description: errorMessage, variant: "destructive" });
    } finally {
 setIsLoadingTask(false);
 setIsLoadingUsers(false); // Users are fetched regardless of project
    }
  }, [taskId, toast]);
  // Removed getTaskById, getProjectById, getAllUsers, state setters as they are stable functions/setters provided by React/libraries
  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  const formatDateDisplay = (dateInput: string | undefined | null, dateFormat: string = 'dd MMMM yyyy, EEEE') => {
    if (!dateInput) return 'Belirtilmemiş';
    try {
      return format(new Date(dateInput), dateFormat, { locale: tr });
    } catch (error) {
      return 'Geçersiz Tarih';
    }
  };

  const getAssignedPersonNames = () => {
    if (!task || !task.assignedTo || task.assignedTo.length === 0) {
      return 'Atanmamış';
    }
    if (isLoadingUsers) return 'Yükleniyor...';
    return task.assignedTo.map(uid => {
      const user = users.find(u => u.uid === uid);
      return user ? `${user.firstName} ${user.lastName}` : `Kullanıcı (ID: ${uid.substring(0,6)}...)`;
    }).join(', ');
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-500 hover:bg-gray-600';
    switch (status) {
      case 'Tamamlandı': return 'bg-green-500 hover:bg-green-600';
      case 'Devam Ediyor': return 'bg-blue-500 hover:bg-blue-600';
      case 'Yapılacak': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Engellendi': return 'bg-red-500 hover:bg-red-600';
      case 'Gözden Geçiriliyor': return 'bg-purple-500 hover:bg-purple-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const isLoading = isLoadingTask || isLoadingProject || isLoadingUsers;

  if (isLoading) {
    return <GlobalLoader message="Görev detayları yükleniyor..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AppLogo className="h-16 w-auto text-destructive mb-4" />
        <AlertTriangle className="w-12 h-12 text-destructive mb-3" />
        <h2 className="text-2xl font-semibold mb-2">Hata</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push('/tasks')}>Görev Listesine Dön</Button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AppLogo className="h-16 w-auto text-muted-foreground mb-4" />
        <AlertTriangle className="w-12 h-12 text-destructive mb-3" />
        <h2 className="text-2xl font-semibold mb-2">Görev Bulunamadı</h2>
        <p className="text-muted-foreground mb-4">Aradığınız görev mevcut değil veya silinmiş olabilir.</p>
        <Button onClick={() => router.push('/tasks')}>Görev Listesine Dön</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/tasks')} className="mb-4 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" /> Görev Listesine Dön
      </Button>

      <Card className="shadow-lg print:shadow-none">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="font-headline text-3xl mb-1">{task.taskName}</CardTitle>
              <CardDescription className="text-base flex items-center">
                <Hotel className="mr-2 h-4 w-4 text-muted-foreground" /> {task.hotel || 'Otel Belirtilmemiş'}
              </CardDescription>
            </div>
            {task.status && <Badge className={`text-sm px-3 py-1 ${getStatusColor(task.status)}`}>{task.status}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-sm sm:text-base">
          
          {task.project && (
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" />Bağlı Proje</h3>
              <p className="text-sm pl-7">
                {isLoadingProject ? <Skeleton className="h-4 w-1/2" /> : (project ? project.projectName : 'Proje bilgisi yüklenemedi veya bulunamadı.')}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary" />Bitiş Tarihi</h3>
            <p className="text-sm pl-7">{formatDateDisplay(task.dueDate)}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center"><Tag className="mr-2 h-5 w-5 text-primary" />Öncelik</h3>
            <p className="text-sm pl-7">{task.priority || 'Belirtilmemiş'}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center"><UserCheck className="mr-2 h-5 w-5 text-primary" />Atanan Kişiler</h3>
            <p className="text-sm pl-7">{getAssignedPersonNames()}</p>
          </div>

          {task.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" />Açıklama</h3>
              <p className="text-sm pl-7 whitespace-pre-line leading-relaxed">{task.description}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-4 border-t mt-6">
            <p>Oluşturulma Tarihi: {formatDateDisplay(task.createdAt, 'dd.MM.yyyy HH:mm')}</p>
            {task.updatedAt && task.updatedAt !== task.createdAt && <p>Son Güncelleme: {formatDateDisplay(task.updatedAt, 'dd.MM.yyyy HH:mm')}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end print:hidden">
          <Button variant="outline" onClick={() => toast({title: "Düzenleme Modu", description:"Görev düzenleme formu burada açılacak."})}>
            <Edit className="mr-2 h-4 w-4" /> Görevi Düzenle
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
