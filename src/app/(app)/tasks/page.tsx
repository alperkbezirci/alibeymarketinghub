
// src/app/(app)/tasks/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { TaskForm } from "@/components/tasks/task-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES, TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { getTasks, addTask, type Task, type TaskInputData } from "@/services/task-service";
import { getProjects, type Project } from "@/services/project-service"; // Projeleri çekmek için eklendi
import { getAllUsers, type User as AppUser } from "@/services/user-service"; // Kullanıcıları çekmek için eklendi
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function TasksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const fetchPageData = useCallback(async () => {
    setIsLoadingTasks(true);
    setIsLoadingProjects(true);
    setIsLoadingUsers(true);
    setError(null);
    try {
      const tasksPromise = getTasks();
      const projectsPromise = getProjects();
      const usersPromise = getAllUsers();

      const [fetchedTasks, fetchedProjects, fetchedUsers] = await Promise.all([
        tasksPromise,
        projectsPromise,
        usersPromise,
      ]);
      
      setTasks(fetchedTasks);
      setProjectsList(fetchedProjects);
      setUsersList(fetchedUsers);

    } catch (err: any) {
      setError(err.message || "Veriler yüklenirken bir hata oluştu.");
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingTasks(false);
      setIsLoadingProjects(false);
      setIsLoadingUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setIsDialogOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname, setIsDialogOpen]);

  const handleSaveTask = async (formData: TaskInputData) => {
    setIsSaving(true);
    try {
      await addTask(formData);
      toast({ title: "Başarılı", description: `${formData.taskName} adlı görev oluşturuldu.` });
      setIsDialogOpen(false);
      fetchPageData(); // Refresh all data
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Görev kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateDisplay = (dateInput: string | undefined | null) => {
    if (!dateInput) return 'N/A';
    try {
      return format(new Date(dateInput), 'dd/MM/yyyy');
    } catch (e) {
      console.error("Error formatting date:", dateInput, e);
      return 'Geçersiz Tarih';
    }
  };

  const getProjectNameById = (projectId?: string): string => {
    if (!projectId) return 'Genel';
    if (isLoadingProjects) return 'Yükleniyor...';
    const project = projectsList.find(p => p.id === projectId);
    return project?.projectName || `Proje ID: ${projectId.substring(0,6)}...`;
  };

  const getAssignedUserNames = (assignedToUids?: string[]): string => {
    if (!assignedToUids || assignedToUids.length === 0) return 'N/A';
    if (isLoadingUsers) return 'Yükleniyor...';
    return assignedToUids.map(uid => {
      const user = usersList.find(u => u.uid === uid);
      return user ? `${user.firstName} ${user.lastName}` : `Kullanıcı (${uid.substring(0,6)}...)`;
    }).join(', ');
  };

  const isLoading = isLoadingTasks || isLoadingProjects || isLoadingUsers;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-headline font-bold">Görevler</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Görev Oluştur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Yeni Görev</DialogTitle>
              <DialogDescription>
                Yeni bir görev oluşturmak için lütfen ilgili alanları doldurun.
              </DialogDescription>
            </DialogHeader>
            <TaskForm 
              onSave={handleSaveTask} 
              onClose={() => setIsDialogOpen(false)}
              isSaving={isSaving}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input placeholder="Görev adında ara..." disabled />
            <Select disabled>
              <SelectTrigger><SelectValue placeholder="Otel Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Oteller</SelectItem>
                {HOTEL_NAMES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select disabled>
              <SelectTrigger><SelectValue placeholder="Durum Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
             <Select disabled>
              <SelectTrigger><SelectValue placeholder="Öncelik Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => toast({description: "Filtreler sıfırlandı (işlevsellik eklenecek)."})}>Filtreleri Sıfırla</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <div className="flex space-x-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-8 text-destructive">
          <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
          <p>{error}</p>
          <Button onClick={fetchPageData} variant="outline" className="mt-4">Tekrar Dene</Button>
        </div>
      )}
      
      {!isLoading && !error && tasks.length === 0 && (
        <p className="col-span-full text-center text-muted-foreground py-8">Gösterilecek görev bulunmamaktadır. Yeni bir görev oluşturabilirsiniz.</p>
      )}

      {!isLoading && !error && tasks.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Card key={task.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-lg">{task.taskName}</CardTitle>
                <CardDescription>
                  Proje: {getProjectNameById(task.project)} | Otel: {task.hotel}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Atanan:</span> {getAssignedUserNames(task.assignedTo)}</p>
                  <p><span className="font-medium">Bitiş Tarihi:</span> {formatDateDisplay(task.dueDate)}</p>
                  <div className="flex space-x-2">
                    <Badge variant={task.status === "Tamamlandı" ? "default" : "secondary"}>{task.status}</Badge>
                    <Badge variant="outline">{task.priority} Öncelik</Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                 <Button variant="outline" size="sm" className="w-full" onClick={() => toast({title: task.taskName, description: "Görev detayları sayfası (veya modal) açılacak."})}>
                  Detayları Gör
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

    