// src/app/(app)/layout.tsx
"use client";
import React, { useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import { AppLogo } from '@/components/layout/app-logo'; 
import { AppLogotype } from '@/components/layout/app-logotype'; // Import logotype
import Link from 'next/link';
import { SpendingCategoriesProvider } from '@/contexts/spending-categories-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const titleId = React.useId();
  const descriptionId = React.useId();


  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <SpendingCategoriesProvider>
      <SidebarProvider defaultOpen={true}>
        <Sidebar 
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          variant="sidebar" 
          collapsible="icon"
        >
          <div className="sr-only">
            <h2 id={titleId}>Ana Menü</h2>
            <p id={descriptionId}>Uygulama ana navigasyon menüsü.</p>
          </div>
          <SidebarHeader className="p-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sidebar-foreground group-data-[collapsible=icon]:justify-center">
              <AppLogo className="h-6 w-auto" /> 
              <AppLogotype className="h-5 w-auto text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
          <SidebarFooter className="p-2 group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} Ali Bey Hotels
            </p>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SpendingCategoriesProvider>
  );
}
