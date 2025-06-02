// src/app/(app)/detailed-reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, type User } from "@/contexts/auth-context"; // Import User type
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, SlidersHorizontal, AreaChart, History, ServerCrash, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { getAllUsers } from '@/services/user-service'; // Import user service
import { Skeleton } from '@/components/ui/skeleton';

interface TimelineItem {
  id?: string;
  time: string;
  user: string;
  action: string;
}

const initialTimelineData: TimelineItem[] = [];

export default function DetailedReportsPage() {
  const { isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();
  const [timelineData, setTimelineData] = useState<TimelineItem[]>(initialTimelineData);
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const fetchUsersForFilter = useCallback(async () => {
    if (!isAdminOrMarketingManager) return;
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
    } catch (error: any) {
      console.error("Error fetching users for filter:", error);
      setUsersError(error.message || "Filtre için kullanıcılar yüklenirken bir hata oluştu.");
      toast({ title: "Kullanıcı Yükleme Hatası", description: error.message || "Filtre için kullanıcılar yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAdminOrMarketingManager, toast]);

  useEffect(() => {
    fetchUsersForFilter();
  }, [fetchUsersForFilter]);

  useEffect(() => {
    if (isAdminOrMarketingManager) {
        console.log("DetailedReportsPage: useEffect - A_FETCH_ACTIVITY_LOG_FROM_FIREBASE");
        // TODO: Fetch timeline data from Firebase
        // const fetchActivities = async () => {
        //   // const activities = await getActivityLogFromFirestore();
        //   // setTimelineData(activities);
        // };
        // fetchActivities();
    }
  }, [isAdminOrMarketingManager]);

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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/> Filtreleme Seçenekleri</CardTitle>
          <CardDescription>Raporları çalışan, otel veya tarih bazlı filtreleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select disabled={isLoadingUsers}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingUsers ? "Çalışanlar yükleniyor..." : "Çalışan Seçin"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Yükleniyor...
                  </div>
                ) : usersError ? (
                  <SelectItem value="error" disabled>{usersError}</SelectItem>
                ) : (
                  <>
                    <SelectItem value="all">Tüm Çalışanlar</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.uid} value={user.uid}>{`${user.firstName} ${user.lastName}`}</SelectItem>
                    ))}
                    {users.length === 0 && !usersError && <SelectItem value="no_users" disabled>Kullanıcı bulunamadı.</SelectItem>}
                  </>
                )}
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
            <Button onClick={() => toast({description: "Raporlar filtrelendi (Firebase'den veri çekilecek)."})}>Filtrele</Button>
            <Button variant="outline" className="ml-2" onClick={() => toast({description: "Filtreler sıfırlandı."})}>Filtreleri Sıfırla</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><AreaChart className="mr-2 h-5 w-5 text-primary"/> Genel İstatistikler</CardTitle>
            <CardDescription>Uygulama genelindeki önemli metrikler ve performans göstergeleri (Firebase'den gelecek).</CardDescription>
        </CardHeader>
        <CardContent>
            {/* TODO: Display charts and stats from Firebase */}
            <p className="text-center text-muted-foreground p-8">Detaylı istatistik grafikleri ve tabloları burada yer alacak. Veriler Firebase'den yüklenecektir.</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><History className="mr-2 h-5 w-5 text-primary"/> Kullanıcı Hareketleri Zaman Çizelgesi</CardTitle>
          <CardDescription>Sistemdeki önemli kullanıcı aktivitelerinin kaydı (Firebase'den gelecek).</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineData.length > 0 ? (
            <ul className="space-y-3">
              {timelineData.map((item, index) => (
                <li key={item.id || index} className="flex items-start text-sm">
                  <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{item.time}</span>
                  <span className="font-medium mr-1">{item.user}:</span>
                  <span>{item.action}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground p-8">Gösterilecek aktivite kaydı bulunmamaktadır. Veriler Firebase'den yüklenecektir.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
