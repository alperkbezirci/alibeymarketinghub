// src/components/layout/header.tsx
"use client";

import Link from 'next/link';
import { Mountain } from 'lucide-react'; // Placeholder for logo
import { UserNav } from '@/components/layout/user-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar'; // Use the trigger from sidebar component


export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="md:hidden mr-2">
            <SidebarTrigger />
          </div>
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="font-headline text-xl font-bold">Ali Bey Marketing Hub</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Add global search here if needed in future */}
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
