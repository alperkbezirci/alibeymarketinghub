
// src/app/(app)/projects/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProjectById, type Project } from '@/services/project-service';
import { getAllUsers, type User as AppUser } from '@/services/user-service'; // Renamed to AppUser to avoid conflict
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, Users, CalendarDays, Info, Hotel, GitBranch } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = typeof params.id === 'string' ? params.id : undefined;

  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) {
      setError("Proje ID'si bulunamadı.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProject = await getProjectById(projectId);
      setProject(fetchedProject);
      if (fetchedProject && fetchedProject.responsiblePersons && fetchedProject.responsiblePersons.length > 0) {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      }
    } catch (err: any) {
      console.error("Error fetching project details:", err);
      setError(err.message || `Proje (ID: ${projectId}) detayları yüklenirken bir hata oluştu.`);
      toast({ title: "Yükleme Hatası", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  const formatDateDisplay = (dateInput: string | undefined | null, dateFormat: string = 'dd MMMM yyyy, EEEE') => {
    if (!dateInput) return 'Belirtilmemiş';
    try {
      return format(new Date(dateInput), dateFormat, { locale: tr });
    } catch (e) {
      return 'Geçersiz Tarih';
    }
  };

  const getResponsiblePersonNames = () => {
    if (!project || !project.responsiblePersons || project.responsiblePersons.length === 0) {
      return 'Atanmamış';
    }
    return project.responsiblePersons.map(uid => {
      const user = users.find(u => u.uid === uid);
      return user ? `${user.firstName} ${user.lastName}` : `Kullanıcı (ID: ${uid.substring(0,6)}...)`;
    }).join(', ');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-5 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Hata</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push('/projects')}>Proje Listesine Dön</Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Proje Bulunamadı</h2>
        <p className="text-muted-foreground mb-4">Aradığınız proje mevcut değil veya silinmiş olabilir.</p>
        <Button onClick={() => router.push('/projects')}>Proje Listesine Dön</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Proje Listesine Dön
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="font-headline text-3xl mb-1">{project.projectName}</CardTitle>
              <CardDescription className="text-base flex items-center">
                <Hotel className="mr-2 h-4 w-4 text-muted-foreground" /> {project.hotel || 'Belirtilmemiş'}
              </CardDescription>
            </div>
            {project.status && <Badge variant={project.status === "Tamamlandı" ? "default" : "secondary"} className="mt-2 sm:mt-0 text-sm px-3 py-1">{project.status}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-base">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary" />Tarihler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pl-7">
              <p><span className="font-medium text-muted-foreground">Başlangıç:</span> {formatDateDisplay(project.startDate)}</p>
              <p><span className="font-medium text-muted-foreground">Bitiş:</span> {formatDateDisplay(project.endDate)}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Sorumlu Kişiler</h3>
            <p className="text-sm pl-7">{getResponsiblePersonNames()}</p>
          </div>

          {project.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Info className="mr-2 h-5 w-5 text-primary" />Açıklama</h3>
              <p className="text-sm pl-7 whitespace-pre-line leading-relaxed">{project.description}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-4 border-t mt-6">
            <p>Oluşturulma Tarihi: {formatDateDisplay(project.createdAt, 'dd.MM.yyyy HH:mm')}</p>
            {project.updatedAt && <p>Son Güncelleme: {formatDateDisplay(project.updatedAt, 'dd.MM.yyyy HH:mm')}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={() => toast({title: "Düzenleme Modu", description:"Proje düzenleme formu burada açılacak."})}>
            Projeyi Düzenle
          </Button>
          {/* <Button variant="destructive" className="ml-2" onClick={() => {/* Delete logic here * /}}>Projeyi Sil</Button> */}
        </CardFooter>
      </Card>
    </div>
  );
}

