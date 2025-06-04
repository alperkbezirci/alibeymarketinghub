
// src/components/projects/project-detail-dialog.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Info, Hotel, Users, Paperclip, Download } from "lucide-react";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Project } from '@/services/project-service';
import type { User as AppUser } from '@/contexts/auth-context'; // Assuming User type is from auth-context
import { cn } from '@/lib/utils';

interface ProjectDetailDialogProps {
  project: Project | null;
  users: AppUser[]; // To resolve responsible person names
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // onEditProject?: (projectId: string) => void; // Future use
  // onDeleteProject?: (projectId: string) => Promise<void>; // Future use
  // isAdminOrManager?: boolean; // Future use for edit/delete buttons
}

export function ProjectDetailDialog({
  project,
  users,
  isOpen,
  onOpenChange,
}: ProjectDetailDialogProps) {

  if (!project) return null;

  const formatDateDisplay = (dateInput: string | undefined | null, dateFormat: string = 'dd MMMM yyyy, EEEE') => {
    if (!dateInput) return 'Belirtilmemiş';
    try {
      return format(new Date(dateInput), dateFormat, { locale: tr });
    } catch (e) {
      return 'Geçersiz Tarih';
    }
  };

  const getResponsiblePersonNames = () => {
    if (!project.responsiblePersons || project.responsiblePersons.length === 0) {
      return 'Atanmamış';
    }
    return project.responsiblePersons.map(uid => {
      const user = users.find(u => u.uid === uid);
      return user ? `${user.firstName} ${user.lastName}` : `Kullanıcı (ID: ${uid.substring(0,6)}...)`;
    }).join(', ');
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-500 hover:bg-gray-600';
    switch (status) {
      case 'Tamamlandı': return 'bg-green-500 hover:bg-green-600';
      case 'Devam Ediyor': return 'bg-blue-500 hover:bg-blue-600';
      case 'Planlama': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Beklemede': return 'bg-orange-500 hover:bg-orange-600';
      case 'İptal Edildi': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };
  
  const getFileNameFromPath = (path?: string) => {
    if (!path) return "Dosyayı İndir";
    const nameWithoutPrefix = path.split('/').pop() || path;
    return nameWithoutPrefix.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '') || "Dosya";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex justify-between items-start">
            <span className="truncate mr-2">{project.projectName || "Proje Detayı"}</span>
            {project.status && <Badge className={cn("text-sm px-3 py-1 whitespace-nowrap shrink-0", getStatusColor(project.status))}>{project.status}</Badge>}
          </DialogTitle>
          <DialogDescription className="text-base flex items-center pt-1">
            <Hotel className="mr-2 h-4 w-4 text-muted-foreground" /> {project.hotel || 'Otel Belirtilmemiş'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 text-sm">
          <div>
            <h4 className="font-semibold mb-1 flex items-center text-primary"><CalendarDays className="mr-2 h-5 w-5" />Tarihler</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm pl-7">
                <p><span className="font-medium text-muted-foreground">Başlangıç:</span> {formatDateDisplay(project.startDate)}</p>
                <p><span className="font-medium text-muted-foreground">Bitiş:</span> {formatDateDisplay(project.endDate)}</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-1 flex items-center text-primary"><Users className="mr-2 h-5 w-5" />Sorumlu Kişiler</h4>
            <p className="pl-7">{users.length > 0 ? getResponsiblePersonNames() : <Skeleton className="h-4 w-1/2" />}</p>
          </div>

          {project.description && (
            <div>
              <h4 className="font-semibold mb-1 flex items-center text-primary"><Info className="mr-2 h-5 w-5" />Açıklama</h4>
              <p className="pl-7 whitespace-pre-line leading-relaxed">{project.description}</p>
            </div>
          )}
          
          {project.projectFileURL && (
            <div>
              <h4 className="font-semibold mb-1 flex items-center text-primary"><Paperclip className="mr-2 h-5 w-5" />Proje Ana Dosyası</h4>
              <p className="pl-7">
                <a href={project.projectFileURL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                  <Download className="mr-1 h-4 w-4" /> 
                  {getFileNameFromPath(project.projectStoragePath) || "Dosyayı İndir"}
                </a>
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-3 border-t mt-4">
            <p>Oluşturulma: {formatDateDisplay(project.createdAt, 'dd.MM.yyyy HH:mm')}</p>
            {project.updatedAt && project.updatedAt !== project.createdAt && (
              <p>Son Güncelleme: {formatDateDisplay(project.updatedAt, 'dd.MM.yyyy HH:mm')}</p>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          {/* 
          Future buttons:
          {isAdminOrManager && onDeleteProject && (
            <Button variant="destructive" onClick={() => onDeleteProject(project.id)}>Sil</Button>
          )}
          {isAdminOrManager && onEditProject && (
            <Button variant="outline" onClick={() => onEditProject(project.id)}>Düzenle</Button>
          )}
          */}
          <DialogClose asChild>
            <Button type="button" variant="outline">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
