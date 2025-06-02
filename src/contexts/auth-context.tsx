// src/contexts/auth-context.tsx
"use client";

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User as FirebaseAuthUser, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; // Assuming firebase.ts is in src/lib

export interface User {
  uid: string; // Changed id to uid to match Firebase
  email: string | null;
  name: string;
  roles: string[];
  photoURL?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdminOrMarketingManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseAuthUser | null) => {
      if (firebaseUser) {
        try {
          // Fetch user details from Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userDataFromFirestore = userDocSnap.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userDataFromFirestore.name || firebaseUser.displayName || "Kullanıcı",
              roles: userDataFromFirestore.roles || [],
              photoURL: firebaseUser.photoURL || userDataFromFirestore.photoURL,
            });
          } else {
            // User exists in Auth but not in Firestore (e.g. new signup or missing record)
            // For now, treat as not fully logged in, or create a default user record.
            // Here, we'll log them out as roles are essential for this app.
            console.warn(`User document not found in Firestore for UID: ${firebaseUser.uid}. Logging out.`);
            await firebaseSignOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
          await firebaseSignOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.replace('/login');
      } else if (user && pathname === '/login') {
        router.replace('/dashboard'); // Default page after login
      }
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: any) {
      console.error("Login failed:", error);
      // alert('Giriş bilgileri hatalı veya kullanıcı bulunamadı.'); 
      // A toast notification would be better here
      setUser(null); // Ensure user state is cleared on failed login
      setLoading(false); // Stop loading on error
      throw error; // Re-throw to allow LoginPage to catch it
    }
    // setLoading(false) will be handled by onAuthStateChanged's setLoading(false)
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting user to null
      router.replace('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
       // setUser(null) and setLoading(false) will be handled by onAuthStateChanged
    }
  }, [router]);

  const isAdminOrMarketingManager = user?.roles.includes('Admin') || user?.roles.includes('Pazarlama Müdürü') || false;
  
  // This loading screen logic might need adjustment depending on desired UX
  // If loading and not on login, show loading. This prevents flicker during initial auth check.
  if (loading && pathname !== '/login') {
    return <div className="flex h-screen items-center justify-center"><p>Yükleniyor...</p></div>;
  }
  
  // If not loading, and no user, and not on login (this case should be handled by redirection useEffect, but as a fallback)
  if (!loading && !user && pathname !== '/login') {
     return <div className="flex h-screen items-center justify-center"><p>Yönlendiriliyor...</p></div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdminOrMarketingManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
