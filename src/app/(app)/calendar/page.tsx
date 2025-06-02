
// src/app/(app)/calendar/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { EventForm } from "@/components/calendar/event-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Added Badge for event type display
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { getEvents, addEvent, type CalendarEvent } from "@/services/calendar-service";
import { Skeleton } from "@/components/ui/skeleton";
import { EVENT_TYPES } from "@/lib/constants"; // For coloring logic

// Helper for event type colors (can be expanded)
const getEventTypeColor = (eventType?: string) => {
  if (!eventType) return "bg-gray-500/20 text-gray-700 dark:text-gray-300"; // Default
  switch (eventType) {
    case EVENT_TYPES[0]: // Organizasyon
    case EVENT_TYPES[8]: // Fuar
    case EVENT_TYPES[9]: // Toplantı
      return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
    case EVENT_TYPES[1]: // Turnuva
      return "bg-green-500/20 text-green-700 dark:text-green-300";
    case EVENT_TYPES[2]: // Info/FamTrip
    case EVENT_TYPES[3]: // Özel Misafir
    case EVENT_TYPES[4]: // Influencer
    case EVENT_TYPES[5]: // Basın
      return "bg-purple-500/20 text-purple-700 dark:text-purple-300";
    case EVENT_TYPES[6]: // Seyahat
    case EVENT_TYPES[7]: // Salescall
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
    default:
      return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
  }
};


export default function CalendarPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchEventsForMonth = useCallback(async (month: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const viewStart = startOfWeek(startOfMonth(month), { locale: tr });
      const viewEnd = endOfWeek(addDays(endOfMonth(month), 7), { locale: tr });
      const fetchedEvents = await getEvents(viewStart, viewEnd);
      setEvents(fetchedEvents);
    } catch (err: any) {
      setError(err.message || "Etkinlikler yüklenirken bir hata oluştu.");
      toast({ title: "Hata", description: err.message || "Etkinlikler yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEventsForMonth(currentMonth);
  }, [currentMonth, fetchEventsForMonth]);

  const daysInMonth = useMemo(() => eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  }), [currentMonth]);

  const startingDayIndex = useMemo(() => {
    const day = getDay(startOfMonth(currentMonth));
    return day === 0 ? 6 : day - 1; // Monday as 0
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    let daysArray = [];
    const firstDayOfGrid = startOfWeek(startOfMonth(currentMonth), { locale: tr });
    const lastDayOfGrid = endOfWeek(endOfMonth(currentMonth), { locale: tr });

    let currentDay = firstDayOfGrid;
    while(daysArray.length < 35) {
         daysArray.push(currentDay);
         currentDay = addDays(currentDay, 1);
    }
    if (daysArray[daysArray.length-1] < lastDayOfGrid || daysArray.length < 42) {
        while(daysArray.length < 42) {
             daysArray.push(currentDay);
             currentDay = addDays(currentDay, 1);
        }
    }
    return daysArray;
  }, [currentMonth]);


  const handleSaveEvent = async (formData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSaving(true);
    try {
      await addEvent(formData);
      toast({ title: "Başarılı", description: `${formData.title} adlı etkinlik oluşturuldu.` });
      setIsDialogOpen(false);
      fetchEventsForMonth(currentMonth);
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Etkinlik kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => event.startDate && isSameDay(new Date(event.startDate), date));
  };

  const formatDateDisplay = (dateInput: Date | string | undefined | null) => {
    if (!dateInput) return 'N/A';
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return 'Geçersiz Tarih';
      // Check if time is midnight (likely only date was set)
      if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
        return format(date, 'dd MMM yyyy', { locale: tr });
      }
      return format(date, 'dd MMM yyyy, HH:mm', { locale: tr });
    } catch (e) {
        return 'Geçersiz Tarih';
    }
  };


  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-headline font-bold">Takvim</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Etkinlik Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Yeni Etkinlik</DialogTitle>
              <DialogDescription>
                Takvime yeni bir etkinlik veya görev ekleyin.
              </DialogDescription>
            </DialogHeader>
            <EventForm
              onSave={handleSaveEvent}
              onClose={() => setIsDialogOpen(false)}
              isSaving={isSaving}
              selectedDate={selectedDate}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="font-headline text-xl text-center">
                {format(currentMonth, "MMMM yyyy", { locale: tr })}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="grid grid-cols-7 gap-px border-t border-l">
                {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(day => (
                  <div key={day} className="py-2 text-center font-medium text-sm border-r border-b bg-muted/50">{day}</div>
                ))}
                {Array.from({ length: 35 }).map((_, index) => (
                  <div key={index} className="p-2 border-r border-b min-h-[100px]">
                    <Skeleton className="h-4 w-1/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            )}
            {error && !isLoading && (
              <div className="text-center py-8 text-destructive">
                <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                <p>{error}</p>
                <Button onClick={() => fetchEventsForMonth(currentMonth)} variant="outline" className="mt-4">Tekrar Dene</Button>
              </div>
            )}
            {!isLoading && !error && (
              <div className="grid grid-cols-7 gap-px border-t border-l">
                {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(day => (
                  <div key={day} className="py-2 text-center font-medium text-sm border-r border-b bg-muted/50">{day}</div>
                ))}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={cn(`p-2 border-r border-b min-h-[100px] transition-colors cursor-pointer hover:bg-accent/50`,
                      isSameMonth(day, currentMonth) ? 'bg-background' : 'bg-muted/20 text-muted-foreground/50',
                      isToday(day) ? 'ring-2 ring-primary' : '',
                      selectedDate && isSameDay(day, selectedDate) ? 'bg-accent' : ''
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <span className={`font-medium ${isSameMonth(day, currentMonth) ? '' : 'opacity-50'}`}>{format(day, "d")}</span>
                    <div className="mt-1 space-y-1 text-xs">
                      {getEventsForDate(day).map(event => (
                         <div key={event.id || event.title} className={cn("p-1 rounded-sm truncate", getEventTypeColor(event.eventType))}>
                          {event.title}
                         </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              {selectedDate ? format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr }) : "Tarih Seçin"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-20 w-full" /> : selectedDateEvents.length > 0 ? (
              <ul className="space-y-3">
                {selectedDateEvents.map(event => (
                  <li key={event.id || event.title} className="p-3 border rounded-md shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-base">{event.title}</p>
                      {event.eventType && <Badge variant="secondary">{event.eventType}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Başlangıç:</span> {formatDateDisplay(event.startDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Bitiş:</span> {formatDateDisplay(event.endDate)}
                    </p>
                    {event.participants && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Katılımcılar:</span> {event.participants}</p>}
                    {event.location && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Yer:</span> {event.location}</p>}
                    {event.description && <p className="text-xs mt-1 pt-1 border-t border-dashed">{event.description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedDate ? "Seçili tarih için etkinlik bulunmamaktadır." : "Detayları görmek için takvimden bir tarih seçin."}
              </p>
            )}
             {!isLoading && events.length === 0 && !selectedDateEvents.length && <p className="text-sm text-muted-foreground pt-4 text-center">Genel olarak gösterilecek etkinlik yok.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
