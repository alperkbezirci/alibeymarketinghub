// src/contexts/auth-context.tsx
"use client";

import type React from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[]; // e.g., ['Admin', 'Pazarlama Müdürü']
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => void; // Simplified login
  logout: () => void;
  isAdminOrMarketingManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data - in a real app, this would come from Firebase Auth
const MOCK_USER_ALPER: User = {
  id: '1',
  email: 'akucukbezirci@alibey.com',
  name: 'Alper Küçükbezirci',
  roles: ['Admin', 'Pazarlama Müdürü'],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simulate checking auth status on mount
    const storedUser = localStorage.getItem('aliBeyMarketingHubUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const login = useCallback((email: string) => {
    // Simplified login: if email matches, log in as Alper
    if (email === MOCK_USER_ALPER.email) {
      localStorage.setItem('aliBeyMarketingHubUser', JSON.stringify(MOCK_USER_ALPER));
      setUser(MOCK_USER_ALPER);
      router.push('/');
    } else {
      // Handle incorrect login (e.g., show error message)
      // For this scaffold, we'll just keep them on the login page.
      alert('Giriş bilgileri hatalı.');
    }
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('aliBeyMarketingHubUser');
    setUser(null);
    router.push('/login');
  }, [router]);

  const isAdminOrMarketingManager = user?.roles.includes('Admin') || user?.roles.includes('Pazarlama Müdürü') || false;

  if (loading && pathname !== '/login') {
     // You can show a global loading spinner here if desired
    return <div className="flex h-screen items-center justify-center"><p>Yükleniyor...</p></div>;
  }
  
  if (!user && pathname !== '/login') {
    // Still loading or redirecting
    return <div className="flex h-screen items-center justify-center"><p>Yönlendiriliyor...</p></div>;
  }


  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdminOrMarketingManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
