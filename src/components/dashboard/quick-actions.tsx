// src/components/dashboard/quick-actions.tsx
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FilePlus, CalendarPlus, Receipt } from "lucide-react";
import { useRouter } from 'next/navigation';

export function QuickActions() {
  const router = useRouter();

  const handleActionClick = (path: string) => {
    router.push(`${path}?action=new`);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Hızlı Eylemler</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Button variant="outline" className="flex flex-col h-24 items-center justify-center space-y-1 p-2 sm:p-4" onClick={() => handleActionClick("/projects")}>
          <PlusCircle className="h-6 w-6 mb-1 text-primary" />
          <span className="text-center text-xs sm:text-sm">{'Proje Oluştur'}</span>
        </Button>
        <Button variant="outline" className="flex flex-col h-24 items-center justify-center space-y-1 p-2 sm:p-4" onClick={() => handleActionClick("/tasks")}>
          <FilePlus className="h-6 w-6 mb-1 text-primary" />
          <span className="text-center text-xs sm:text-sm">{'Görev Ekle'}</span>
        </Button>
        <Button variant="outline" className="flex flex-col h-24 items-center justify-center space-y-1 p-2 sm:p-4" onClick={() => handleActionClick("/budget")}>
          <Receipt className="h-6 w-6 mb-1 text-primary" />
          <span className="text-center text-xs sm:text-sm">{'Fatura Ekle'}</span>
        </Button>
        <Button variant="outline" className="flex flex-col h-24 items-center justify-center space-y-1 p-2 sm:p-4" onClick={() => handleActionClick("/calendar")}>
          <CalendarPlus className="h-6 w-6 mb-1 text-primary" />
          <span className="text-center text-xs sm:text-sm">{'Etkinlik Ekle'}</span>
        </Button>
      </CardContent>
    </Card>
  );
}
