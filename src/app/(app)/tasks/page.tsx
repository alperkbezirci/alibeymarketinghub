// src/app/(app)/tasks/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
// import { TaskForm } from "@/components/tasks/task-form"; // To be created
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES, TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

// TODO: Define a proper interface for Task
interface Task {
  id: string;
  taskName: string;
  project: string;
  hotel: string;
  status: string;
  priority: string;
  dueDate: string; // Consider using Date type
  assignedTo: string;
  // Add other fields as necessary
}

export default function TasksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]); // Initial state is an empty array
  const { toast } = useToast();

  useEffect(() => {
    // TODO: Fetch tasks from Firebase here and update the 'tasks' state
    // Example:
    // const fetchTasks = async () => {
    //   // const fetchedTasks = await getTasksFromFirestore();
    //   // setTasks(fetchedTasks);
    // };
    // fetchTasks();
    console.log("TasksPage: useEffect - A_FETCH_TASKS_FROM_FIREBASE");
  }, []);

  const handleSaveTask = (formData: any) => {
    console.log("Yeni Görev Kaydedildi (Firebase'e eklenecek):", formData);
    // TODO: Save formData to Firebase, then refetch tasks or update state optimistically
    const newTask: Task = { 
      ...formData, 
      id: String(tasks.length + 1 + Math.random()) // Temporary ID generation
    };
    setTasks(prev => [newTask, ...prev]);
    toast({ title: "Başarılı", description: `${formData.taskName} adlı görev oluşturuldu (yerel). Firebase'e kaydedilecek.` });
    setIsDialogOpen(false);
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
            {/* <TaskForm onSave={handleSaveTask} onClose={() => setIsDialogOpen(false)} /> */}
            <p className="p-4 text-center text-muted-foreground">Görev formu (TaskForm) buraya eklenecek. Şimdilik örnek bir görev ekleniyor.</p>
            <div className="flex justify-end p-4">
              <Button onClick={() => {
                handleSaveTask({ taskName: 'Örnek Görev (Firebase)', project: 'Örnek Proje', hotel: 'BIJAL', status: 'Yapılacak', priority: 'Orta', dueDate: new Date().toISOString().split('T')[0], assignedTo: 'Test Kullanıcısı' });
              }}>Örnek Görev Ekle (Yerel)</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Section Placeholder */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input placeholder="Görev adında ara..." />
            <Select>
              <SelectTrigger><SelectValue placeholder="Otel Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Oteller</SelectItem>
                {HOTEL_NAMES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger><SelectValue placeholder="Durum Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
             <Select>
              <SelectTrigger><SelectValue placeholder="Öncelik Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => toast({description: "Filtreler sıfırlandı."})}>Filtreleri Sıfırla</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-lg">{task.taskName}</CardTitle>
              <CardDescription>Proje: {task.project} | Otel: {task.hotel}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Atanan:</span> {task.assignedTo}</p>
                <p><span className="font-medium">Bitiş Tarihi:</span> {new Date(task.dueDate).toLocaleDateString('tr-TR')}</p>
                <div className="flex space-x-2">
                  <Badge variant={task.status === "Tamamlandı" ? "default" : "secondary"}>{task.status}</Badge>
                  <Badge variant="outline">{task.priority} Öncelik</Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter>
               <Button variant="outline" size="sm" className="w-full" onClick={() => toast({title: task.taskName, description: "Görev detayları açılacak (Firebase'den çekilecek)."})}>
                Detayları Gör
              </Button>
            </CardFooter>
          </Card>
        ))}
        {tasks.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">Gösterilecek görev bulunmamaktadır. Yeni bir görev oluşturabilirsiniz.</p>}
      </div>
    </div>
  );
}
