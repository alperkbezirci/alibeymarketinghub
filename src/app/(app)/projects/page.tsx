// src/app/(app)/projects/page.tsx
"use client";

import React, { useState } from "react";
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

// Placeholder data - in a real app, this would come from Firestore
const sampleProjects = [
  { id: "1", projectName: "Yaz Sezonu Kampanyası", hotel: "Ali Bey Resort Sorgun", status: "Devam Ediyor", endDate: "2024-09-30", responsiblePersons: "Ayşe Y., Mehmet K." },
  { id: "2", name: "Web Sitesi Yenileme Projesi", hotel: "BIJAL", status: "Planlama", endDate: "2024-12-15", responsiblePersons: "Zeynep A." },
  { id: "3", name: "Sadakat Programı Geliştirme", hotel: "Ali Bey Hotels & Resorts", status: "Tamamlandı", endDate: "2024-05-01", responsiblePersons: "Ali V." },
];


export default function ProjectsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projects, setProjects] = useState(sampleProjects); // Placeholder state
  const { toast } = useToast();

  const handleSaveProject = (formData: any) => {
    console.log("Yeni Proje Kaydedildi:", formData);
    // In a real app, you would save to Firestore and update state
    const newProject = { ...formData, id: String(projects.length + 1), name: formData.projectName }; // simplified
    setProjects(prev => [newProject, ...prev]);
    toast({ title: "Başarılı", description: `${formData.projectName} adlı proje oluşturuldu.` });
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
              <CardTitle className="font-headline text-xl">{project.name || project.projectName}</CardTitle>
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
              <Button variant="outline" size="sm" className="w-full" onClick={() => toast({title: project.name, description: "Proje detayları açılacak."})}>
                Detayları Gör
              </Button>
            </CardFooter>
          </Card>
        ))}
        {projects.length === 0 && <p className="col-span-full text-center text-muted-foreground">Gösterilecek proje bulunmamaktadır.</p>}
      </div>
    </div>
  );
}
