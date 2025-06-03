// src/app/page.tsx
"use client";

import React, { useEffect } from 'react'; 
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { GlobalLoader } from '@/components/layout/global-loader'; // GlobalLoader import edildi

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

  // Auth durumu belirlenene kadar GlobalLoader göster
  if (loading) {
    return <GlobalLoader />;
  }
  
  // Kullanıcı durumu netleşene kadar veya yönlendirme gerçekleşene kadar bir yükleme ekranı.
  // Bu, AuthProvider'ın yönlendirmesi beklenirken kısa bir süre görünebilir.
  return <GlobalLoader message="Yönlendiriliyor..." />;
}
