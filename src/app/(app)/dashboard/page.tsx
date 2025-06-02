// src/app/(app)/dashboard/page.tsx
"use client";

import { WelcomeMessage } from "@/components/dashboard/welcome-message";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { useAuth } from "@/contexts/auth-context";
import { Briefcase, ListTodo, CheckSquare } from "lucide-react";

// Placeholder data - in a real app, this would come from Firestore
const activeProjectsData = [
  { id: "1", name: "Yeni Sezon Lansmanı - Ali Bey Resort Sorgun", detail: "Bitiş Tarihi: 30.09.2024" },
  { id: "2", name: "BIJAL Web Sitesi Yenileme", detail: "Bitiş Tarihi: 15.10.2024" },
  { id: "3", name: "Club & Park Manavgat Sosyal Medya Kampanyası", detail: "Bitiş Tarihi: 01.11.2024" },
];

const overdueTasksData = [
  { id: "t1", name: "Lansman Bütçe Onayı", detail: "Proje: Yeni Sezon Lansmanı" },
  { id: "t2", name: "Web Sitesi İçerik Planı Hazırlığı", detail: "Proje: BIJAL Web Sitesi" },
];

const pendingApprovalsData = [
  { id: "a1", name: "Sorgun Tanıtım Videosu Kurgusu", detail: "Gönderen: Ayşe Yılmaz" },
  { id: "a2", name: "Manavgat Influencer Anlaşması", detail: "Gönderen: Mehmet Öztürk" },
];


export default function DashboardPage() {
  const { isAdminOrMarketingManager } = useAuth();

  return (
    <div className="space-y-6">
      <WelcomeMessage />
      <QuickActions />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <OverviewCard title="Aktif Projeler" IconComponent={Briefcase} items={activeProjectsData} />
        <OverviewCard title="Gecikmiş Görevler" IconComponent={ListTodo} items={overdueTasksData} />
        {isAdminOrMarketingManager && (
          <OverviewCard title="Onay Bekleyen İşler" IconComponent={CheckSquare} items={pendingApprovalsData} />
        )}
      </div>

    </div>
  );
}
