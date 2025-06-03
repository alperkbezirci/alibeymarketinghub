
// src/components/tasks/task-form.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES, TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { Task, TaskInputData } from '@/services/task-service';
import { getProjects, type Project } from '@/services/project-service';

interface TaskFormProps {
  onSave: (formData: TaskInputData) => Promise<void>;
  initialData?: Partial<Task>; // Task interface now has string dates
  onClose: () => void;
  isSaving?: boolean;
}

export function TaskForm({ onSave, initialData, onClose, isSaving }: TaskFormProps) {
  const [taskName, setTaskName] = useState(initialData?.taskName || "");
  const [selectedProject, setSelectedProject] = useState(initialData?.project || ""); 
  const [hotel, setHotel] = useState(initialData?.hotel || (HOTEL_NAMES.length > 0 ? HOTEL_NAMES[0] : ""));
  const [status, setStatus] = useState(initialData?.status || TASK_STATUSES[0]);
  const [priority, setPriority] = useState(initialData?.priority || TASK_PRIORITIES[1]); // Default to Medium
  const [dueDate, setDueDate] = useState<Date | undefined>(initialData?.dueDate ? new Date(initialData.dueDate) : undefined);
  const [assignedTo, setAssignedTo] = useState(initialData?.assignedTo || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchProjectsForSelect = useCallback(async () => {
    setIsLoadingProjects(true);
    setProjectsError(null);
    try {
      const fetchedProjects = await getProjects();
      setProjectsList(fetchedProjects as Project[]);
    } catch (err: any) {
      setProjectsError(err.message || "Projeler yüklenirken bir hata oluştu.");
      // No toast here, just log or handle silently for form element
      console.error("Error fetching projects for task form:", err.message);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchProjectsForSelect();
  }, [fetchProjectsForSelect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName || !dueDate) {
      toast({ title: "Eksik Bilgi", description: "Görev adı ve bitiş tarihi zorunludur.", variant: "destructive" });
      return;
    }

    const formData: TaskInputData = {
      taskName,
      project: selectedProject, // Pass selected project ID or empty string
      hotel,
      status,
      priority,
      dueDate, // Pass Date object
      assignedTo,
      description,
    };
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="taskName">Görev Adı *</Label>
        <Input id="taskName" value={taskName} onChange={(e) => setTaskName(e.target.value)} required />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="project">İlgili Proje</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isLoadingProjects}>
            <SelectTrigger id="project">
              <SelectValue placeholder={isLoadingProjects ? "Projeler yükleniyor..." : "Proje seçin (opsiyonel)"} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingProjects ? (
                <SelectItem value="loading" disabled>Yükleniyor...</SelectItem>
              ) : projectsError ? (
                <SelectItem value="error" disabled>{projectsError}</SelectItem>
              ) : (
                <>
                  <SelectItem value="">Proje seçmeyin (Genel)</SelectItem>
                  {projectsList.map(p => <SelectItem key={p.id} value={p.id}>{p.projectName}</SelectItem>)}
                  {projectsList.length === 0 && !projectsError && <SelectItem value="no_projects" disabled>Proje bulunamadı.</SelectItem>}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="hotel">Otel</Label>
          <Select value={hotel} onValueChange={setHotel}>
            <SelectTrigger id="hotel"><SelectValue placeholder="Otel seçin" /></SelectTrigger>
            <SelectContent>
              {HOTEL_NAMES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Durum</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status"><SelectValue placeholder="Durum seçin" /></SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Öncelik</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="priority"><SelectValue placeholder="Öncelik seçin" /></SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="dueDate">Bitiş Tarihi *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus locale={tr} required />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="assignedTo">Atanan Kişi</Label>
        <Input id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Kullanıcı adı veya e-postası"/>
      </div>

      <div>
        <Label htmlFor="description">Açıklama</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>İptal</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData?.id ? 'Güncelle' : 'Kaydet'}
        </Button>
      </div>
    </form>
  );
}
