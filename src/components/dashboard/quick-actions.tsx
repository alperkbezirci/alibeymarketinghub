// src/components/dashboard/quick-actions.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FilePlus, CalendarPlus, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function QuickActions() {
  const { toast } = useToast();

  const handleActionClick = (actionName: string) => {
    // In a real app, this would open a modal or navigate to a page
    toast({
      title: "Eylem Başlatıldı",
      description: `${actionName} işlemi için arayüz açılacak. (Bu bir demo mesajıdır)`,
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Hızlı Eylemler</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Button variant="outline" className="flex flex-col h-24 items-center justify-center space-y-1 p-2 sm:p-4" onClick={() => handleActionClick("Proje Oluştur")}>
          <PlusCircle className="h-6 w-6 mb-1 text-primary" />
          <span className="text-center text-xs sm:text-sm">Proje Oluştur</span>
        </Button>
        <Button variant="outline" className="flex flex-col h-24 items-center justify-center space-y-1 p-2 sm:p-4" onClick={() => handleActionClick("Görev Ekle")}>
          <FilePlus className="h-6 w-6 mb-1 text-primary" />
          <span className="text-center text-xs sm:text-sm">Görev Ekle</span>
        </Button>
        <Button variant="outline" className="flex flex-col h-24 items-center justify-center space-y-1 p-2 sm:p-4" onClick={() => handleActionClick("Fatura Ekle")}>
          <Receipt className="h-6 w-6 mb-1 text-primary" />
          <span className="text-center text-xs sm:text-sm">Fatura Ekle</span>
        </Button>
        <Button variant="outline" className="flex flex-col h-24 items-center justify-center space-y-1 p-2 sm:p-4" onClick={() => handleActionClick("Etkinlik Ekle")}>
          <CalendarPlus className="h-6 w-6 mb-1 text-primary" />
          <span className="text-center text-xs sm:text-sm">Etkinlik Ekle</span>
        </Button>
      </CardContent>
    </Card>
  );
}
