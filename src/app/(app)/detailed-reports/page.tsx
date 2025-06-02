// src/app/(app)/detailed-reports/page.tsx
"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, SlidersHorizontal, AreaChart, History, ServerCrash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

// Placeholder data
const timelineData = [
  { time: "10:32", user: "Alper K.", action: "Yeni proje oluşturdu: 'Sonbahar Kampanyası'" },
  { time: "11:15", user: "Ayşe Y.", action: "'Ana Sayfa Tasarımı' görevini tamamladı." },
  { time: "14:00", user: "Mehmet Ö.", action: "'Bütçe Teklifi' dosyasını onaya gönderdi." },
  { time: "16:45", user: "Alper K.", action: "'Bütçe Teklifi' dosyasını onayladı." },
];


export default function DetailedReportsPage() {
  const { isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();

  if (!isAdminOrMarketingManager) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Erişim Reddedildi</h1>
        <p className="text-muted-foreground">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold">Detaylı Raporlar</h1>
         <Button variant="outline">
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Raporu Özelleştir
        </Button>
      </div>

      {/* Filters Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/> Filtreleme Seçenekleri</CardTitle>
          <CardDescription>Raporları çalışan, otel veya tarih bazlı filtreleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select>
              <SelectTrigger><SelectValue placeholder="Çalışan Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Çalışanlar</SelectItem>
                <SelectItem value="alper">Alper Küçükbezirci</SelectItem>
                <SelectItem value="ayse">Ayşe Yılmaz</SelectItem>
                {/* Add more users */}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger><SelectValue placeholder="Otel Seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Oteller</SelectItem>
                {HOTEL_NAMES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" placeholder="Başlangıç Tarihi" />
            <Input type="date" placeholder="Bitiş Tarihi" />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => toast({description: "Raporlar filtrelendi."})}>Filtrele</Button>
            <Button variant="outline" className="ml-2" onClick={() => toast({description: "Filtreler sıfırlandı."})}>Filtreleri Sıfırla</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Placeholder */}
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><AreaChart className="mr-2 h-5 w-5 text-primary"/> Genel İstatistikler</CardTitle>
            <CardDescription>Uygulama genelindeki önemli metrikler ve performans göstergeleri.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-center text-muted-foreground p-8">Detaylı istatistik grafikleri ve tabloları burada yer alacak.</p>
        </CardContent>
      </Card>

      {/* Timeline Placeholder */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><History className="mr-2 h-5 w-5 text-primary"/> Kullanıcı Hareketleri Zaman Çizelgesi</CardTitle>
          <CardDescription>Sistemdeki önemli kullanıcı aktivitelerinin kaydı.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {timelineData.map((item, index) => (
              <li key={index} className="flex items-start text-sm">
                <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{item.time}</span>
                <span className="font-medium mr-1">{item.user}:</span>
                <span>{item.action}</span>
              </li>
            ))}
          </ul>
           {timelineData.length === 0 && <p className="text-center text-muted-foreground p-8">Gösterilecek aktivite kaydı bulunmamaktadır.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
