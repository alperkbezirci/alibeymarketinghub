// src/app/(app)/dashboard/page.tsx
"use client";

import React from 'react';
import { WelcomeMessage } from "@/components/dashboard/welcome-message";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { useAuth } from "@/contexts/auth-context";
import { Briefcase, ListTodo, CheckSquare } from "lucide-react";

// TODO: Fetch active projects, overdue tasks, and pending approvals from Firebase
const activeProjectsData: { id: string; name: string; detail?: string }[] = [];
const overdueTasksData: { id: string; name: string; detail?: string }[] = [];
const pendingApprovalsData: { id: string; name: string; detail?: string }[] = [];


export default function DashboardPage() {
  const { isAdminOrMarketingManager } = useAuth();

  return (
    <div className="space-y-6">
      <WelcomeMessage />
      <QuickActions />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <OverviewCard title="Aktif Projeler" IconComponent={Briefcase} items={activeProjectsData} emptyMessage="Aktif proje bulunmamaktadır." />
        <OverviewCard title="Gecikmiş Görevler" IconComponent={ListTodo} items={overdueTasksData} emptyMessage="Gecikmiş görev bulunmamaktadır." />
        {isAdminOrMarketingManager && (
          <OverviewCard title="Onay Bekleyen İşler" IconComponent={CheckSquare} items={pendingApprovalsData} emptyMessage="Onay bekleyen iş bulunmamaktadır." />
        )}
      </div>

    </div>
  );
}
