// src/app/(app)/calendar/page.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// import { EventForm } from "@/components/calendar/event-form"; // To be created
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar"; // For single date picking
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,getDay,isSameMonth, isToday,isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// Placeholder event data
const sampleEvents = [
  { date: new Date(2024, 6, 15), title: "Proje A Lansmanı", type: "project" }, // July 15th (month is 0-indexed)
  { date: new Date(2024, 6, 22), title: "Müşteri Toplantısı", type: "event" }, // July 22nd
  { date: new Date(), title: "Günlük Rapor Gönderimi", type: "task" },
];

export default function CalendarPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Add empty cells for days from previous month to align first day of the week
  const startingDayIndex = getDay(startOfMonth(currentMonth)) === 0 ? 6 : getDay(startOfMonth(currentMonth)) -1; // Monday as first day (0=Sunday, 1=Monday ..)
  const prefixDays = Array.from({ length: startingDayIndex }).map((_, i) => null);
  const calendarDays = [...prefixDays, ...daysInMonth];


  const handleSaveEvent = (formData: any) => {
    console.log("Yeni Etkinlik Kaydedildi:", formData);
    toast({ title: "Başarılı", description: `${formData.eventName} adlı etkinlik oluşturuldu.` });
    setIsDialogOpen(false);
  };

  const getEventsForDate = (date: Date) => {
    return sampleEvents.filter(event => isSameDay(event.date, date));
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
            </DialogHeader>
            {/* <EventForm onSave={handleSaveEvent} onClose={() => setIsDialogOpen(false)} /> */}
             <p className="p-4 text-center text-muted-foreground">Etkinlik formu buraya eklenecek.</p>
             <div className="flex justify-end p-4">
              <Button onClick={() => handleSaveEvent({eventName: 'Örnek Etkinlik'})}>Örnek Etkinlik Ekle</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
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
            <div className="grid grid-cols-7 gap-px border-t border-l">
              {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(day => (
                <div key={day} className="py-2 text-center font-medium text-sm border-r border-b bg-muted/50">{day}</div>
              ))}
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`p-2 border-r border-b min-h-[100px] transition-colors cursor-pointer hover:bg-accent/50
                    ${day && isSameMonth(day, currentMonth) ? 'bg-background' : 'bg-muted/20 text-muted-foreground/50'}
                    ${day && isToday(day) ? 'ring-2 ring-primary' : ''}
                    ${day && selectedDate && isSameDay(day, selectedDate) ? 'bg-accent' : ''}
                  `}
                  onClick={() => day && setSelectedDate(day)}
                >
                  {day && (
                    <>
                      <span className="font-medium">{format(day, "d")}</span>
                      <div className="mt-1 space-y-1 text-xs">
                        {getEventsForDate(day).map(event => (
                           <div key={event.title} className={`p-1 rounded-sm truncate ${
                            event.type === 'project' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' : 
                            event.type === 'task' ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 
                            'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                          }`}>{event.title}</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Details View */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              {selectedDate ? format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr }) : "Tarih Seçin"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length > 0 ? (
              <ul className="space-y-2">
                {selectedDateEvents.map(event => (
                  <li key={event.title} className="p-2 border rounded-md">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">Tür: {event.type === 'project' ? 'Proje' : event.type === 'task' ? 'Görev' : 'Etkinlik'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedDate ? "Seçili tarih için etkinlik bulunmamaktadır." : "Detayları görmek için takvimden bir tarih seçin."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
