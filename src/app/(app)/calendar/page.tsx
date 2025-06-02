
// src/app/(app)/calendar/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { EventForm } from "@/components/calendar/event-form"; // Import new EventForm
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { getEvents, addEvent, type CalendarEvent } from "@/services/calendar-service"; // Import calendar service
import { Skeleton } from "@/components/ui/skeleton";

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
      // Fetch events for a slightly wider range to catch events spilling from adjacent weeks
      const viewStart = startOfWeek(startOfMonth(month), { locale: tr });
      const viewEnd = endOfWeek(endOfMonth(month), { locale: tr });
      const fetchedEvents = await getEvents(viewStart, viewEnd);
      setEvents(fetchedEvents);
    } catch (err: any) {
      setError(err.message || "Etkinlikler yüklenirken bir hata oluştu.");
      toast({ title: "Hata", description: err.message, variant: "destructive" });
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
    const prefixDaysCount = startingDayIndex;
    const suffixDaysCount = 6 - (getDay(endOfMonth(currentMonth)) === 0 ? 6 : getDay(endOfMonth(currentMonth)) -1) ;
    
    let daysToDisplay = [];
    // Add days from previous month
    for (let i = prefixDaysCount; i > 0; i--) {
      daysToDisplay.push(subMonths(endOfMonth(subMonths(currentMonth,1)), i-1 ));
    }
    // Add days from current month
    daysToDisplay.push(...daysInMonth);
    // Add days from next month
    for (let i = 1; i <= suffixDaysCount; i++) {
      daysToDisplay.push(addMonths(startOfMonth(addMonths(currentMonth,1)), i-1));
    }
     // Ensure calendar grid is always 6 weeks (42 days)
    const totalCells = daysToDisplay.length <= 35 ? 35 : 42;
    const currentCells = daysToDisplay.length;
    if(currentCells < totalCells) {
      const lastDayInGrid = daysToDisplay[daysToDisplay.length - 1];
      for(let i=1; i <= totalCells - currentCells; i++) {
        daysToDisplay.push(new Date(lastDayInGrid.getFullYear(), lastDayInGrid.getMonth(), lastDayInGrid.getDate() + i));
      }
    }


    return daysToDisplay;
  }, [daysInMonth, startingDayIndex, currentMonth]);


  const handleSaveEvent = async (formData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSaving(true);
    try {
      await addEvent(formData);
      toast({ title: "Başarılı", description: `${formData.title} adlı etkinlik oluşturuldu.` });
      setIsDialogOpen(false);
      fetchEventsForMonth(currentMonth); // Refresh the list
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Etkinlik kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => event.date && isSameDay(new Date(event.date), date));
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
          <DialogContent className="sm:max-w-lg">
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
                {Array.from({ length: 35 }).map((_, index) => ( // 5 weeks of skeletons
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
                    className={`p-2 border-r border-b min-h-[100px] transition-colors cursor-pointer hover:bg-accent/50
                      ${isSameMonth(day, currentMonth) ? 'bg-background' : 'bg-muted/20 text-muted-foreground/50'}
                      ${isToday(day) ? 'ring-2 ring-primary' : ''}
                      ${selectedDate && isSameDay(day, selectedDate) ? 'bg-accent' : ''}
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    <span className={`font-medium ${isSameMonth(day, currentMonth) ? '' : 'opacity-50'}`}>{format(day, "d")}</span>
                    <div className="mt-1 space-y-1 text-xs">
                      {getEventsForDate(day).map(event => (
                         <div key={event.id || event.title} className={`p-1 rounded-sm truncate ${
                          event.type === 'project' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' : 
                          event.type === 'task' ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 
                          'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                        }`}>{event.title}</div>
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
              <ul className="space-y-2">
                {selectedDateEvents.map(event => (
                  <li key={event.id || event.title} className="p-2 border rounded-md">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">Tür: {event.type.charAt(0).toUpperCase() + event.type.slice(1)}</p>
                    {event.description && <p className="text-xs mt-1">{event.description}</p>}
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
