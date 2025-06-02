// src/components/projects/project-form.tsx
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES, PROJECT_STATUSES } from "@/lib/constants";
import { CalendarIcon, Info, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { generateDescription } from '@/ai/flows/ai-assisted-descriptions';

interface ProjectFormProps {
  onSave: (formData: any) => void; // Replace 'any' with a proper type
  initialData?: any; // For editing
  onClose: () => void;
}

export function ProjectForm({ onSave, initialData, onClose }: ProjectFormProps) {
  const [projectName, setProjectName] = useState(initialData?.projectName || "");
  const [responsiblePersons, setResponsiblePersons] = useState(initialData?.responsiblePersons || ""); // Simplified as text for now
  const [startDate, setStartDate] = useState<Date | undefined>(initialData?.startDate ? new Date(initialData.startDate) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(initialData?.endDate ? new Date(initialData.endDate) : undefined);
  const [status, setStatus] = useState(initialData?.status || PROJECT_STATUSES[0]);
  const [hotel, setHotel] = useState(initialData?.hotel || HOTEL_NAMES[0]);
  const [description, setDescription] = useState(initialData?.description || "");
  const [aiAssist, setAiAssist] = useState(false);
  const [aiDetails, setAiDetails] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const { toast } = useToast();

  const handleGenerateDescription = async () => {
    if (!aiDetails.trim()) {
      toast({ title: "Hata", description: "Lütfen yapay zeka için proje detaylarını girin.", variant: "destructive" });
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const result = await generateDescription({ details: aiDetails });
      setDescription(result.description);
      toast({ title: "Başarılı", description: "Proje açıklaması yapay zeka tarafından oluşturuldu." });
    } catch (error) {
      console.error("Error generating description:", error);
      toast({ title: "Hata", description: "Açıklama oluşturulurken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!projectName || !startDate || !endDate) {
      toast({ title: "Eksik Bilgi", description: "Lütfen tüm zorunlu alanları doldurun.", variant: "destructive" });
      return;
    }
    const formData = { projectName, responsiblePersons, startDate, endDate, status, hotel, description /*, files */ };
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="projectName">Proje Adı *</Label>
        <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="responsiblePersons">Sorumlu Kişiler</Label>
        <Input id="responsiblePersons" value={responsiblePersons} onChange={(e) => setResponsiblePersons(e.target.value)} placeholder="Virgülle ayırarak girin" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Başlangıç Tarihi *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal">
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
          <Label htmlFor="endDate">Bitiş Tarihi *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={tr} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Proje Durumu</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status"><SelectValue placeholder="Durum seçin" /></SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
      <div>
        <Label htmlFor="description">Açıklama</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>
      <div className="items-top flex space-x-2">
        <Checkbox id="aiAssist" checked={aiAssist} onCheckedChange={(checked) => setAiAssist(Boolean(checked))} />
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
          <Textarea id="aiDetails" value={aiDetails} onChange={(e) => setAiDetails(e.target.value)} placeholder="Proje hedefleri, anahtar noktalar, hedef kitle vb." rows={3}/>
          <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDescription}>
            {isGeneratingDescription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Info className="mr-2 h-4 w-4" />}
            Açıklama Oluştur
          </Button>
        </div>
      )}
      <div>
        <Label htmlFor="files">Dosya Yükleme</Label>
        <Input id="files" type="file" multiple />
        <p className="text-xs text-muted-foreground mt-1">Birden fazla dosya seçebilirsiniz.</p>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
        <Button type="submit">Kaydet</Button>
      </div>
    </form>
  );
}
