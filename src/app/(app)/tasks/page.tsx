
// src/app/(app)/tasks/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { TaskForm } from "@/components/tasks/task-form"; // Import new TaskForm
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES, TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { getTasks, addTask, type Task } from "@/services/task-service"; // Import task service
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedTasks = await getTasks();
      setTasks(fetchedTasks);
    } catch (err: any) {
      setError(err.message || "Görevler yüklenirken bir hata oluştu.");
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSaveTask = async (formData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSaving(true);
    try {
      await addTask(formData);
      toast({ title: "Başarılı", description: `${formData.taskName} adlı görev oluşturuldu.` });
      setIsDialogOpen(false);
      fetchTasks(); // Refresh the list
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Görev kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateDisplay = (dateInput: Date | string | undefined | null) => {
    if (!dateInput) return 'N/A';
    try {
      return format(new Date(dateInput), 'dd/MM/yyyy');
    } catch (e) {
      return 'Geçersiz Tarih';
    }
  };

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
          <Button onClick={fetchTasks} variant="outline" className="mt-4">Tekrar Dene</Button>
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
                  {task.project ? `Proje: ${task.project} | ` : ''}Otel: {task.hotel}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Atanan:</span> {task.assignedTo || 'N/A'}</p>
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
