
// src/components/tasks/task-detail-dialog.tsx
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Briefcase, Hotel, CalendarDays, Tag, UserCheck, ListChecks } from "lucide-react";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Task } from '@/services/task-service';
import type { Project } from '@/services/project-service';
import type { User as AppUser } from '@/contexts/auth-context'; // Assuming User type is exported from auth-context

interface TaskDetailDialogProps {
  task: Task | null;
  project: Project | null | undefined; // Can be null (no project) or undefined (still loading/not found)
  assignedUsers: AppUser[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  isAdminOrManager: boolean;
  isLoadingProject?: boolean; // Optional loading state for project
}

export function TaskDetailDialog({
  task,
  project,
  assignedUsers,
  isOpen,
  onOpenChange,
  onDeleteTask,
  isAdminOrManager,
  isLoadingProject
}: TaskDetailDialogProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!task) return null;

  const formatDateDisplay = (dateInput: string | undefined | null, dateFormat: string = 'dd MMMM yyyy, EEEE') => {
    if (!dateInput) return 'Belirtilmemiş';
    try {
      return format(new Date(dateInput), dateFormat, { locale: tr });
    } catch (_e) {
      return 'Geçersiz Tarih';
    }
  };

  const getAssignedPersonNames = () => {
    if (!task.assignedTo || task.assignedTo.length === 0) {
      return 'Atanmamış';
    }
    return task.assignedTo.map(uid => {
      const user = assignedUsers.find(u => u.uid === uid);
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

  const handleDeleteConfirm = async () => {
    if (!task) return;
    setIsDeleting(true);
    await onDeleteTask(task.id);
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
    onOpenChange(false); // Close the main detail dialog as well
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange} >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl flex justify-between items-center">
              {task.taskName}
              {task.status && <Badge className={`text-sm px-3 py-1 ml-2 ${getStatusColor(task.status)}`}>{task.status}</Badge>}
            </DialogTitle>
            <DialogDescription className="text-base flex items-center pt-1">
              <Hotel className="mr-2 h-4 w-4 text-muted-foreground" id="task-description" /> {task.hotel || 'Otel Belirtilmemiş'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-sm">
            {task.project && (
              <div>
                <h4 className="font-semibold mb-1 flex items-center"><Briefcase className="mr-2 h-4 w-4 text-primary" />Bağlı Proje</h4>
                <p className="pl-6">
                  {isLoadingProject ? <Skeleton className="h-4 w-3/4" /> : (project ? project.projectName : (task.project ? 'Proje Yüklenemedi/Bulunamadı' : 'Genel Görev'))}
                </p>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-1 flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-primary" />Bitiş Tarihi</h4>
              <p className="pl-6">{formatDateDisplay(task.dueDate)}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1 flex items-center"><Tag className="mr-2 h-4 w-4 text-primary" />Öncelik</h4>
              <p className="pl-6">{task.priority || 'Belirtilmemiş'}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-1 flex items-center"><UserCheck className="mr-2 h-4 w-4 text-primary" />Atanan Kişiler</h4>
              <p className="pl-6">{getAssignedPersonNames()}</p>
            </div>

            {task.description && (
              <div>
                <h4 className="font-semibold mb-1 flex items-center"><ListChecks className="mr-2 h-4 w-4 text-primary" />Açıklama</h4>
                <p className="pl-6 whitespace-pre-line leading-relaxed">{task.description}</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-3 border-t mt-4">
              <p>Oluşturulma: {formatDateDisplay(task.createdAt, 'dd.MM.yyyy HH:mm')}</p>
              {task.updatedAt && task.updatedAt !== task.createdAt && <p>Son Güncelleme: {formatDateDisplay(task.updatedAt, 'dd.MM.yyyy HH:mm')}</p>}
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            {isAdminOrManager && (
              <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" /> Görevi Sil
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="outline">Kapat</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAdminOrManager && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Görevi Silmek Üzeresiniz</AlertDialogTitle>
              <AlertDialogDescription>
                "{task.taskName}" adlı görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                {task.turqualityTaskId && " Bu görev bir Turquality faturasıyla ilişkili olabilir. Silinmesi durumunda bağlantı kopacaktır."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Evet, Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
