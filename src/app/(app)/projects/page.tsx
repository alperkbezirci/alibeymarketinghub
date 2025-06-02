// src/app/(app)/projects/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES, PROJECT_STATUSES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

// TODO: Define a proper interface for Project
interface Project {
  id: string;
  projectName: string; // Or 'name' depending on your Firestore structure
  hotel: string;
  status: string;
  endDate: string; // Consider using Date type
  responsiblePersons: string;
  // Add other fields as necessary
}

export default function ProjectsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]); // Initial state is an empty array
  const { toast } = useToast();

  useEffect(() => {
    // TODO: Fetch projects from Firebase here and update the 'projects' state
    // Example:
    // const fetchProjects = async () => {
    //   // const fetchedProjects = await getProjectsFromFirestore();
    //   // setProjects(fetchedProjects);
    // };
    // fetchProjects();
    console.log("ProjectsPage: useEffect - A_FETCH_PROJECTS_FROM_FIREBASE");
  }, []);

  const handleSaveProject = (formData: any) => {
    console.log("Yeni Proje Kaydedildi (Firebase'e eklenecek):", formData);
    // TODO: Save formData to Firebase, then refetch projects or update state optimistically
    const newProject: Project = { 
      ...formData, 
      id: String(projects.length + 1 + Math.random()), // Temporary ID generation
      name: formData.projectName // Ensure 'name' or 'projectName' consistency
    }; 
    setProjects(prev => [newProject, ...prev]);
    toast({ title: "Başarılı", description: `${formData.projectName} adlı proje oluşturuldu (yerel). Firebase'e kaydedilecek.` });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-headline font-bold">Projeler</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
            <ProjectForm onSave={handleSaveProject} onClose={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Section Placeholder */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input placeholder="Proje adında ara..." />
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
                {PROJECT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => toast({description: "Filtreler sıfırlandı."})}>Filtreleri Sıfırla</Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-xl">{project.projectName}</CardTitle>
              <CardDescription>{project.hotel}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Sorumlular:</span> {project.responsiblePersons}</p>
                <p><span className="font-medium">Bitiş Tarihi:</span> {new Date(project.endDate).toLocaleDateString('tr-TR')}</p>
                 <Badge variant={project.status === "Tamamlandı" ? "default" : "secondary"}>{project.status}</Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" onClick={() => toast({title: project.projectName, description: "Proje detayları açılacak (Firebase'den çekilecek)."})}>
                Detayları Gör
              </Button>
            </CardFooter>
          </Card>
        ))}
        {projects.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">Gösterilecek proje bulunmamaktadır. Yeni bir proje oluşturabilirsiniz.</p>}
      </div>
    </div>
  );
}
