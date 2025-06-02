// src/app/page.tsx
"use client";

import React, { useEffect } from 'react'; // Added React import
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard'); // Default page after login
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Yükleniyor...</p>
    </div>
  );
}
