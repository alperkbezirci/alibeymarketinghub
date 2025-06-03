// src/components/layout/header.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { AppLogo } from '@/components/layout/app-logo'; 
import { AppLogotype } from '@/components/layout/app-logotype'; // Import logotype
import { UserNav } from '@/components/layout/user-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar'; 


export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="md:hidden mr-2">
            <SidebarTrigger />
          </div>
          <Link href="/dashboard" className="flex items-center space-x-2">
            <AppLogo className="h-6 w-auto text-primary" /> 
            <AppLogotype className="h-5 w-auto text-primary hidden sm:block" /> 
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
