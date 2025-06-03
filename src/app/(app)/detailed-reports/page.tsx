
// src/app/(app)/detailed-reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, type User as AuthUser } from "@/contexts/auth-context"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, SlidersHorizontal, AreaChart, History, Loader2, AlertTriangle, LineChart as LucideLineChart, BarChart as BarChartIcon, PieChart as LucidePieChart, Users, ListChecks, Activity, RefreshCw, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { getAllUsers } from '@/services/user-service'; 
import { getProjectCountByStatus } from '@/services/project-service';
import { getTaskCountByStatus } from '@/services/task-service';
import { getGlobalActivityLog, type ProjectActivity, type ProjectActivityType } from '@/services/project-activity-service';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLogo } from '@/components/layout/app-logo';
import { BarChart, Bar, Pie, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

interface ChartDataItem {
  name: string;
  value: number;
}

const PIE_CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function DetailedReportsPage() {
  const { isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [projectStatusData, setProjectStatusData] = useState<ChartDataItem[]>([]);
  const [isLoadingProjectStatus, setIsLoadingProjectStatus] = useState(true);
  const [projectStatusError, setProjectStatusError] = useState<string | null>(null);

  const [taskStatusData, setTaskStatusData] = useState<ChartDataItem[]>([]);
  const [isLoadingTaskStatus, setIsLoadingTaskStatus] = useState(true);
  const [taskStatusError, setTaskStatusError] = useState<string | null>(null);

  const [activityLog, setActivityLog] = useState<ProjectActivity[]>([]);
  const [isLoadingActivityLog, setIsLoadingActivityLog] = useState(true);
  const [activityLogError, setActivityLogError] = useState<string | null>(null);
  
  const [selectedUserIdFilter, setSelectedUserIdFilter] = useState<string>("all");
  // For future use:
  // const [selectedHotelFilter, setSelectedHotelFilter] = useState<string>("all");
  // const [dateRangeFilter, setDateRangeFilter] = useState<{ start?: Date, end?: Date }>({});

  const fetchAllData = useCallback(async () => {
    if (!isAdminOrMarketingManager) return;

    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
    } catch (error: any) {
      setUsersError(error.message || "Kullanıcılar yüklenemedi.");
      toast({ title: "Kullanıcı Yükleme Hatası", description: error.message || "Kullanıcılar yüklenemedi.", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }

    setIsLoadingProjectStatus(true);
    setProjectStatusError(null);
    try {
      const counts = await getProjectCountByStatus();
      setProjectStatusData(counts.map(item => ({ name: item.status, value: item.count })));
    } catch (error: any) {
      setProjectStatusError(error.message || "Proje durumları yüklenemedi.");
      toast({ title: "Proje İstatistik Hatası", description: error.message || "Proje durumları yüklenemedi.", variant: "destructive" });
    } finally {
      setIsLoadingProjectStatus(false);
    }

    setIsLoadingTaskStatus(true);
    setTaskStatusError(null);
    try {
      const counts = await getTaskCountByStatus();
      setTaskStatusData(counts.map(item => ({ name: item.status, value: item.count })));
    } catch (error: any) {
      setTaskStatusError(error.message || "Görev durumları yüklenemedi.");
      toast({ title: "Görev İstatistik Hatası", description: error.message || "Görev durumları yüklenemedi.", variant: "destructive" });
    } finally {
      setIsLoadingTaskStatus(false);
    }

    fetchActivityLog(); // Call separately as it depends on filters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrMarketingManager, toast]); // Removed fetchActivityLog from deps to avoid re-triggering initial all fetches

  const fetchActivityLog = useCallback(async () => {
    if (!isAdminOrMarketingManager) return;
    setIsLoadingActivityLog(true);
    setActivityLogError(null);
    try {
      const logOptions: { limit: number; userId?: string } = { limit: 50 };
      if (selectedUserIdFilter !== "all") {
        logOptions.userId = selectedUserIdFilter;
      }
      const log = await getGlobalActivityLog(logOptions);
      setActivityLog(log);
    } catch (error: any) {
      setActivityLogError(error.message || "Aktivite kaydı yüklenemedi.");
      toast({ title: "Aktivite Kaydı Hatası", description: error.message || "Aktivite kaydı yüklenemedi.", variant: "destructive" });
    } finally {
      setIsLoadingActivityLog(false);
    }
  }, [isAdminOrMarketingManager, toast, selectedUserIdFilter]);


  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    // Refetch activity log when user filter changes
    if(isAdminOrMarketingManager) {
        fetchActivityLog();
    }
  }, [selectedUserIdFilter, fetchActivityLog, isAdminOrMarketingManager]);


  const getActivityDescription = (activity: ProjectActivity): string => {
    switch (activity.type) {
      case 'comment':
        return `"${activity.content?.substring(0, 50)}${activity.content && activity.content.length > 50 ? '...' : ''}" şeklinde yorum yaptı.`;
      case 'file_upload':
        return `"${activity.fileName || 'bir dosya'}" yükledi. ${activity.content ? `(Not: ${activity.content.substring(0,30)}...)` : '' }`;
      case 'status_update':
        return `bir aktivitenin durumunu güncelledi: ${activity.status}.`; // Daha detaylı olabilir
      default:
        return `bir eylem gerçekleştirdi (${activity.type}).`;
    }
  };

  const renderPieChart = (data: ChartDataItem[], title: string, isLoading: boolean, error: string | null) => {
    if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <p className="text-destructive text-center py-8">{error}</p>;
    if (data.length === 0) return <p className="text-muted-foreground text-center py-8">Bu grafik için veri bulunmamaktadır.</p>;

    return (
      <div>
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              fontSize={12}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [value, name]}/>
            <Legend wrapperStyle={{fontSize: "12px"}}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };


  if (!isAdminOrMarketingManager && !isLoadingUsers) { // Check isLoadingUsers to avoid flash of this message
     return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <AppLogo className="h-20 w-auto text-destructive mb-6" />
        <h1 className="text-2xl font-bold mb-2">Erişim Reddedildi</h1>
        <p className="text-muted-foreground">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-headline font-bold">Detaylı Raporlar</h1>
         <div className="flex space-x-2">
            <Button variant="outline" onClick={fetchAllData} disabled={isLoadingUsers || isLoadingProjectStatus || isLoadingTaskStatus || isLoadingActivityLog}>
                <RefreshCw className="mr-2 h-4 w-4" /> Verileri Yenile
            </Button>
            {/* <Button variant="outline" disabled>
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Raporu Özelleştir
            </Button> */}
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/> Filtreleme Seçenekleri</CardTitle>
          <CardDescription>Aktivite kaydı için kullanıcıya göre filtreleyin. Diğer filtreler yakında eklenecektir.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={selectedUserIdFilter} onValueChange={setSelectedUserIdFilter} disabled={isLoadingUsers}>
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
            <Select disabled>
              <SelectTrigger><SelectValue placeholder="Otel Seçin (Yakında)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Oteller</SelectItem>
                {HOTEL_NAMES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" placeholder="Başlangıç Tarihi (Yakında)" disabled />
            <Input type="date" placeholder="Bitiş Tarihi (Yakında)" disabled />
          </div>
          {/* 
          <div className="mt-4 flex justify-end">
            <Button onClick={() => toast({description: "Raporlar filtrelendi (Firebase'den veri çekilecek)."})}>Filtrele</Button>
            <Button variant="outline" className="ml-2" onClick={() => toast({description: "Filtreler sıfırlandı."})}>Filtreleri Sıfırla</Button>
          </div>
          */}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><AreaChart className="mr-2 h-5 w-5 text-primary"/> Genel İstatistikler</CardTitle>
            <CardDescription>Proje ve görev durumlarının genel dağılımı.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {renderPieChart(projectStatusData, "Proje Durum Dağılımı", isLoadingProjectStatus, projectStatusError)}
            {renderPieChart(taskStatusData, "Görev Durum Dağılımı", isLoadingTaskStatus, taskStatusError)}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><History className="mr-2 h-5 w-5 text-primary"/> Kullanıcı Hareketleri Zaman Çizelgesi</CardTitle>
          <CardDescription>Sistemdeki son kullanıcı aktivitelerinin kaydı (En fazla 50 aktivite gösterilir).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivityLog ? (
             <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : activityLogError ? (
            <p className="text-destructive text-center py-8">{activityLogError}</p>
          ) : activityLog.length > 0 ? (
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {activityLog.map((activity) => (
                <li key={activity.id} className="flex items-start text-sm p-2 border-b last:border-b-0 hover:bg-muted/30 rounded-md">
                  <div className="flex-shrink-0 w-24">
                     <span className="font-mono text-xs text-muted-foreground" title={format(parseISO(activity.createdAt), 'dd MMMM yyyy HH:mm:ss', { locale: tr })}>
                      {format(parseISO(activity.createdAt), 'dd.MM.yy HH:mm', { locale: tr })}
                    </span>
                  </div>
                  <div className="ml-3 flex-grow">
                    <span className="font-medium mr-1">{activity.userName}:</span>
                    <span>{getActivityDescription(activity)}</span>
                    {activity.projectId && (
                      <Link href={`/projects/${activity.projectId}`} className="text-xs text-blue-500 hover:underline ml-1">(Proje Detayı)</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground p-8">Seçili filtreler için gösterilecek aktivite kaydı bulunmamaktadır.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
