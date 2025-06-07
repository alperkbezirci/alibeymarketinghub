// src/components/layout/global-loader.tsx
"use client";

import React from 'react';
import { AppLogo } from '@/components/layout/app-logo';
import { Loader2 } from 'lucide-react';

export function GlobalLoader({ message = "Yükleniyor..." }: GlobalLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <AppLogo className="h-20 w-auto text-primary mb-6 animate-pulse" />
      <div className="flex items-center text-lg">
        <Loader2 className="h-6 w-6 mr-3 animate-spin text-primary" />
        <span>{message}</span>
      </div>
    </div>
  );
}
