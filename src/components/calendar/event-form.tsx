
// src/components/calendar/event-form.tsx
// src/components/calendar/event-form.tsx

import React, { useState, useEffect } from 'react';
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
import type { CalendarEvent, CalendarEventInputData } from '@/services/calendar-service'; // Import CalendarEvent (for initialData) and CalendarEventInputData
import { EVENT_TYPES } from "@/lib/constants";

interface EventFormProps {
  onSave: (formData: CalendarEventInputData) => Promise<void>;
  initialData?: Partial<CalendarEvent>; // CalendarEvent interface now has string dates
  onClose: () => void;
  isSaving?: boolean;
  selectedDate?: Date;
}

export function EventForm({ onSave, initialData, onClose, isSaving, selectedDate }: EventFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [eventType, setEventType] = useState(initialData?.eventType || (EVENT_TYPES.length > 0 ? EVENT_TYPES[0] : ""));
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.startDate ? new Date(initialData.startDate) : selectedDate || new Date()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData?.endDate ? new Date(initialData.endDate) : startDate || new Date()
  );
  const [participants, setParticipants] = useState(initialData?.participants || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const { toast } = useToast();

  useEffect(() => {
    // If selectedDate prop changes and it's different from current startDate, update startDate.
    // Also, if endDate was same as old startDate, update endDate to new selectedDate as well.
    if (selectedDate) {
        const newStartDate = new Date(selectedDate); // Ensure it's a new Date object
        if (!startDate || newStartDate.getTime() !== startDate.getTime()) {
            setStartDate(newStartDate);
            if (!endDate || (startDate && endDate.getTime() === startDate.getTime())) {
                setEndDate(new Date(newStartDate)); // Ensure endDate is also a new Date object
            }
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]); // Removed startDate and endDate from deps to avoid loop with their setters


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast({ title: "Eksik Bilgi", description: "Etkinlik adı zorunludur.", variant: "destructive" });
      return;
    }
    if (!startDate) {
      toast({ title: "Eksik Bilgi", description: "Başlangıç tarihi zorunludur.", variant: "destructive" });
      return;
    }
    if (!endDate) {
      toast({ title: "Eksik Bilgi", description: "Bitiş tarihi zorunludur.", variant: "destructive" });
      return;
    }
    if (startDate > endDate) {
      toast({ title: "Tarih Hatası", description: "Başlangıç tarihi, bitiş tarihinden sonra olamaz.", variant: "destructive" });
      return;
    }
    if (!eventType) {
      toast({ title: "Eksik Bilgi", description: "Etkinlik türü seçmek zorunludur.", variant: "destructive" });
      return;
    }


    const formData: CalendarEventInputData = {
      title,
      eventType,
      startDate, // Pass Date object
      endDate,   // Pass Date object
      participants,
      location,
      description,
    };
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="eventTitle">Etkinlik Adı <span className="text-destructive">*</span></Label>
        <Input id="eventTitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div>
        <Label htmlFor="eventType">Etkinlik Türü <span className="text-destructive">*</span></Label>
        <Select value={eventType} onValueChange={setEventType} required>
          <SelectTrigger id="eventType"><SelectValue placeholder="Etkinlik türü seçin" /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="eventStartDate">Başlangıç Tarihi <span className="text-destructive">*</span></Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP HH:mm", { locale: tr }) : <span>Tarih seçin</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={tr} required />
              {/* Basic time input - for more complex needs, consider a dedicated time picker component */}
              <div className="p-2 border-t">
                <Label htmlFor="startTime">Saat:</Label>
                <Input type="time" id="startTime" className="mt-1"
                  value={startDate ? format(startDate, "HH:mm") : ""}
                  onChange={(e) => {
                    if (startDate) {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newDate = new Date(startDate);
                      newDate.setHours(hours, minutes);
                      setStartDate(newDate);
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="eventEndDate">Bitiş Tarihi <span className="text-destructive">*</span></Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP HH:mm", { locale: tr }) : <span>Tarih seçin</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={tr} required 
                disabled={ (date) => startDate ? date < new Date(new Date(startDate).setHours(0,0,0,0)) : false } // Disable days before startDate
              />
               <div className="p-2 border-t">
                <Label htmlFor="endTime">Saat:</Label>
                <Input type="time" id="endTime" className="mt-1"
                  value={endDate ? format(endDate, "HH:mm") : ""}
                  onChange={(e) => {
                    if (endDate) {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newDate = new Date(endDate);
                      newDate.setHours(hours, minutes);
                      setEndDate(newDate);
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <Label htmlFor="eventParticipants">Katılımcılar</Label>
        <Input id="eventParticipants" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Virgülle ayırarak girin"/>
      </div>

      <div>
        <Label htmlFor="eventLocation">Yer</Label>
        <Input id="eventLocation" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Etkinlik mekanı"/>
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

