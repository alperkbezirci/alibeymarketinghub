
// src/components/projects/project-form.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HOTEL_NAMES, PROJECT_STATUSES } from "@/lib/constants";
import { CalendarIcon, Info, Loader2, ChevronDown, Users, UploadCloud } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { generateDescription } from '@/ai/flows/ai-assisted-descriptions';
import type { Project, ProjectFormData } from '@/services/project-service'; // Updated to ProjectFormData
import { getAllUsers, type User } from '@/services/user-service';
import { cn } from "@/lib/utils";

interface ProjectFormProps {
  onSave: (formData: ProjectFormData) => Promise<void>; // Expects ProjectFormData now
  initialData?: Partial<Project>; 
  onClose: () => void;
  isSaving?: boolean;
}

export function ProjectForm({ onSave, initialData, onClose, isSaving }: ProjectFormProps) {
  const [projectName, setProjectName] = useState(initialData?.projectName || "");
  const [startDate, setStartDate] = useState<Date | undefined>(initialData?.startDate ? new Date(initialData.startDate) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(initialData?.endDate ? new Date(initialData.endDate) : undefined);
  const [status, setStatus] = useState(initialData?.status || PROJECT_STATUSES[0]);
  const [hotel, setHotel] = useState(initialData?.hotel || (HOTEL_NAMES.length > 0 ? HOTEL_NAMES[0] : ""));
  const [description, setDescription] = useState(initialData?.description || "");
  const [aiAssist, setAiAssist] = useState(false);
  const [aiDetails, setAiDetails] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedResponsiblePersons, setSelectedResponsiblePersons] = useState<string[]>(
    Array.isArray(initialData?.responsiblePersons) ? initialData.responsiblePersons : []
  );
  
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [selectedProjectFileName, setSelectedProjectFileName] = useState<string | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);


  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const fetchedUsers = await getAllUsers();
      setUsersList(fetchedUsers);
    } catch (err: any) {
 setUsersError(err instanceof Error ? err.message : "Kullanıcılar yüklenirken bir hata oluştu.");
      toast({ title: "Hata", description: err.message || "Kullanıcılar yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // If initialData includes a projectFileURL, try to display a file name
  useEffect(() => {
    if (initialData?.projectFileURL) {
        try {
            const url = new URL(initialData.projectFileURL);
            const pathSegments = url.pathname.split('/');
            const lastSegment = decodeURIComponent(pathSegments[pathSegments.length - 1]);
            // Extract the original filename if it was appended after a UUID-like part
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
            setSelectedProjectFileName(lastSegment.replace(uuidPattern, ''));
        } catch (e) {
            setSelectedProjectFileName("Mevcut dosya");
        }
    }
  }, [initialData?.projectFileURL]);

  const handleResponsiblePersonChange = (userId: string, checked: boolean) => {
    setSelectedResponsiblePersons(prev =>
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  const handleGenerateDescription = async () => {
    if (!aiDetails.trim()) {
      toast({ title: "Eksik Bilgi", description: "Lütfen yapay zeka için proje detaylarını girin.", variant: "destructive" });
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const result = await generateDescription({ details: aiDetails });
      if (result.error) {
        toast({ title: "Yapay Zeka Hatası", description: result.error, variant: "destructive" });
      } else if (result.description) {
        setDescription(result.description);
        toast({ title: "Başarılı", description: "Proje açıklaması yapay zeka tarafından oluşturuldu." });
      } else {
        toast({ title: "Yapay Zeka Hatası", description: "Açıklama oluşturulamadı, bilinmeyen bir sorun oluştu.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error generating description from UI:", error);
      toast({ title: "Sistem Hatası", description: "Açıklama oluşturulurken bir sistem hatası oluştu.", variant: "destructive" });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProjectFile(e.target.files[0]);
      setSelectedProjectFileName(e.target.files[0].name);
    } else {
      setProjectFile(null);
      setSelectedProjectFileName(null);
      // If user deselects, clear the input so they can select the same file again if needed
      if (projectFileInputRef.current) {
        projectFileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !endDate) {
      toast({ title: "Eksik Bilgi", description: "Proje adı ve bitiş tarihi zorunludur.", variant: "destructive" });
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      toast({ title: "Tarih Hatası", description: "Başlangıç tarihi, bitiş tarihinden sonra olamaz.", variant: "destructive" });
      return;
    }

    const formData: ProjectFormData = {
      projectName,
      responsiblePersons: selectedResponsiblePersons,
      startDate: startDate || undefined, 
      endDate, 
      status,
      hotel,
      description,
      projectFile: projectFile // Pass the File object
    };
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="projectName">Proje Adı <span className="text-destructive">*</span></Label>
        <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required disabled={isSaving}/>
      </div>
      <div>
        <Label htmlFor="responsiblePersons">Sorumlu Kişiler</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal flex items-center" disabled={isSaving}>
              <Users className="mr-2 h-4 w-4" />
              {selectedResponsiblePersons.length > 0
                ? `${selectedResponsiblePersons.length} kullanıcı seçildi`
                : "Sorumlu seçin"}
              <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            {isLoadingUsers ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Kullanıcılar yükleniyor... <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin"/></div>
            ) : usersError ? (
              <div className="p-4 text-center text-sm text-destructive">{usersError}</div>
            ) : usersList.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Kullanıcı bulunamadı.</div>
            ) : (
              <ScrollArea className="h-48">
                <div className="p-2 space-y-1">
                {usersList.map(user => (
                  <div key={user.uid} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
                    <Label htmlFor={`user-${user.uid}`} className="font-normal flex-grow cursor-pointer">
                      {`${user.firstName} ${user.lastName}`}
                      <span className="text-xs text-muted-foreground ml-2">({user.email})</span>
                    </Label>
                    <Checkbox
                      id={`user-${user.uid}`}
                      checked={selectedResponsiblePersons.includes(user.uid)}
                      onCheckedChange={(checked) => handleResponsiblePersonChange(user.uid, Boolean(checked))}
                      disabled={isSaving}
                    />
                  </div>
                ))}
                </div>
              </ScrollArea>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Başlangıç Tarihi</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal" disabled={isSaving}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={tr} />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="endDate">Bitiş Tarihi <span className="text-destructive">*</span></Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal" disabled={isSaving}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={tr} required />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Proje Durumu</Label>
          <Select value={status} onValueChange={setStatus} disabled={isSaving}>
            <SelectTrigger id="status"><SelectValue placeholder="Durum seçin" /></SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="hotel">Otel</Label>
          <Select value={hotel} onValueChange={setHotel} disabled={isSaving}>
            <SelectTrigger id="hotel"><SelectValue placeholder="Otel seçin" /></SelectTrigger>
            <SelectContent>
              {HOTEL_NAMES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="description">Açıklama</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} disabled={isSaving}/>
      </div>
      <div className="items-top flex space-x-2">
        <Checkbox id="aiAssist" checked={aiAssist} onCheckedChange={(checked) => setAiAssist(Boolean(checked))} disabled={isSaving}/>
        <div className="grid gap-1.5 leading-none">
          <label htmlFor="aiAssist" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Açıklama için Yapay Zeka Desteği
          </label>
          <p className="text-xs text-muted-foreground">
            İşaretlerseniz, proje detaylarını girerek yapay zekadan açıklama oluşturabilirsiniz.
          </p>
        </div>
      </div>
      {aiAssist && (
        <div className="space-y-2 rounded-md border p-4">
          <Label htmlFor="aiDetails">Yapay Zeka için Proje Detayları</Label>
          <Textarea id="aiDetails" value={aiDetails} onChange={(e) => setAiDetails(e.target.value)} placeholder="Proje hedefleri, anahtar noktalar, hedef kitle vb." rows={3} disabled={isSaving || isGeneratingDescription}/>
          <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDescription || isSaving}>
            {isGeneratingDescription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Info className="mr-2 h-4 w-4" />}
            Açıklama Oluştur
          </Button>
        </div>
      )}
      <div>
        <Label htmlFor="projectFile">Proje Ana Dosyası (Opsiyonel)</Label>
        <div className="flex flex-col gap-2 mt-1">
            <Input 
                id="projectFile"
                name="projectFile"
                type="file" 
                ref={projectFileInputRef}
                className="hidden"
                onChange={handleProjectFileChange}
                disabled={isSaving}
            />
            <Label
                htmlFor="projectFile"
                className={cn(
                    buttonVariants({ variant: "outline" }),
                    "cursor-pointer w-full sm:w-auto justify-center flex items-center",
                    isSaving && "opacity-50 cursor-not-allowed"
                )}
                onClick={(e) => { if (isSaving) e.preventDefault(); }}
            >
                <UploadCloud className="mr-2 h-4 w-4" />
                Dosya Seç
            </Label>
            {selectedProjectFileName ? (
                <p className="text-sm text-muted-foreground">Seçilen dosya: {selectedProjectFileName}</p>
            ) : (
                <p className="text-sm text-muted-foreground">Ana proje dosyası seçilmedi.</p>
            )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Tek bir ana proje dosyası yükleyebilirsiniz (örn: sunum, plan).</p>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>İptal</Button>
        <Button type="submit" disabled={isSaving || isGeneratingDescription}>
          {(isSaving || isGeneratingDescription) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData?.id ? 'Güncelle' : 'Kaydet'}
        </Button>
      </div>
    </form>
  );
}

    
