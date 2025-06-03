
// src/app/(app)/projects/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES, PROJECT_STATUSES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { getProjects, addProject, type Project, type ProjectFormData, type ProjectInputDataForService } from "@/services/project-service";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

export default function ProjectsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);
    } catch (err: any) {
      setError(err.message || "Projeler yüklenirken bir hata oluştu.");
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setIsDialogOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname, setIsDialogOpen]);

  const handleSaveProject = async (formData: ProjectFormData) => {
    setIsSaving(true);
    let projectFileURL: string | undefined = undefined;
    let projectStoragePath: string | undefined = undefined;

    try {
      if (formData.projectFile) {
        const file = formData.projectFile;
        const uniqueFileName = `${uuidv4()}-${file.name}`;
        // Store in a general projects folder or projects/{projectId}/ - projectId not available yet
        const filePath = `project-files/${uniqueFileName}`; 
        
        const clientSideStorage = getStorage();
        const fileRef = storageRef(clientSideStorage, filePath);

        toast({ title: "Yükleniyor...", description: `Proje dosyası "${file.name}" yükleniyor.`});
        await uploadBytes(fileRef, file);
        projectFileURL = await getDownloadURL(fileRef);
        projectStoragePath = filePath;
        toast({ title: "Başarılı", description: `Proje dosyası "${file.name}" başarıyla yüklendi.`});
      }

      const projectDataForService: ProjectInputDataForService = {
        projectName: formData.projectName,
        responsiblePersons: formData.responsiblePersons,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        hotel: formData.hotel,
        description: formData.description,
        projectFileURL: projectFileURL,
        projectStoragePath: projectStoragePath,
      };
      
      await addProject(projectDataForService);
      toast({ title: "Başarılı", description: `${formData.projectName} adlı proje oluşturuldu.` });
      setIsDialogOpen(false);
      fetchProjects();
    } catch (err: any)      {
      toast({ title: "Hata", description: err.message || "Proje kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateDisplay = (dateInput: string | undefined | null, dateFormat: string = 'dd/MM/yyyy') => {
    if (!dateInput) return 'N/A';
    try {
      return format(new Date(dateInput), dateFormat, { locale: tr });
    } catch (e) {
      console.error("Error formatting date:", dateInput, e);
      return 'Geçersiz Tarih';
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-headline font-bold">Projeler</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Proje Oluştur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Yeni Proje</DialogTitle>
              <DialogDescription>
                Yeni bir proje oluşturmak için lütfen aşağıdaki alanları doldurun. Yapay zeka desteği ile açıklama oluşturabilirsiniz.
              </DialogDescription>
            </DialogHeader>
            <ProjectForm
              onSave={handleSaveProject}
              onClose={() => setIsDialogOpen(false)}
              isSaving={isSaving}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input placeholder="Proje adında ara..." disabled />
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
                {PROJECT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-6 w-1/4" />
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
          <Button onClick={fetchProjects} variant="outline" className="mt-4">Tekrar Dene</Button>
        </div>
      )}

      {!isLoading && !error && projects.length === 0 && (
        <p className="col-span-full text-center text-muted-foreground py-8">
          Gösterilecek proje bulunmamaktadır. Sağ üst köşedeki 'Yeni Proje Oluştur' butonu ile ilk projenizi ekleyebilirsiniz.
        </p>
      )}

      {!isLoading && !error && projects.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-xl">{project.projectName}</CardTitle>
                <CardDescription>{project.hotel}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Sorumlular:</span> {project.responsiblePersons && project.responsiblePersons.length > 0 ? `${project.responsiblePersons.length} kişi` : 'N/A'}</p>
                  <p><span className="font-medium">Başlangıç:</span> {formatDateDisplay(project.startDate)}</p>
                  <p><span className="font-medium">Bitiş:</span> {formatDateDisplay(project.endDate)}</p>
                  <Badge variant={project.status === "Tamamlandı" ? "default" : "secondary"}>{project.status}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/projects/${project.id}`}>
                    Detayları Gör
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
    
