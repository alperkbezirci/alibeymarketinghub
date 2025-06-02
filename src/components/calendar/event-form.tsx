
// src/components/calendar/event-form.tsx
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { CalendarEvent } from '@/services/calendar-service';

interface EventFormProps {
  onSave: (formData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: Partial<CalendarEvent>;
  onClose: () => void;
  isSaving?: boolean;
  selectedDate?: Date;
}

const EVENT_TYPES = ["event", "task", "project"]; // Add more as needed

export function EventForm({ onSave, initialData, onClose, isSaving, selectedDate }: EventFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState<Date | undefined>(initialData?.date ? new Date(initialData.date) : selectedDate || new Date());
  const [type, setType] = useState(initialData?.type || EVENT_TYPES[0]);
  const [description, setDescription] = useState(initialData?.description || "");
  // TODO: Add projectId, taskId fields if needed

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      toast({ title: "Eksik Bilgi", description: "Etkinlik başlığı ve tarih zorunludur.", variant: "destructive" });
      return;
    }

    const formData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      date,
      type,
      description,
    };
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="eventTitle">Etkinlik Başlığı *</Label>
        <Input id="eventTitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      
      <div>
        <Label htmlFor="eventDate">Tarih *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={tr} required />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="eventType">Etkinlik Türü</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="eventType"><SelectValue placeholder="Tür seçin" /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="eventDescription">Açıklama</Label>
        <Textarea id="eventDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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
