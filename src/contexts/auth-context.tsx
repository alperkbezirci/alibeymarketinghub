
// src/contexts/auth-context.tsx
"use client";

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User as FirebaseAuthUser, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface User {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  title?: string; // Ünvan
  organization?: string; // Kurum
  roles: string[]; // Rol
  authorizationLevel?: string; // Yetki Seviyesi
  photoURL?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdminOrMarketingManager: boolean;
  getDisplayName: () => string;
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
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userDataFromFirestore = userDocSnap.data();
            
            let currentFirstName = userDataFromFirestore.firstName;
            let currentLastName = userDataFromFirestore.lastName;

            if (!currentFirstName && firebaseUser.displayName) {
              const nameParts = firebaseUser.displayName.split(' ');
              currentFirstName = nameParts[0] || "Kullanıcı";
              currentLastName = nameParts.slice(1).join(' ') || "";
            } else if (!currentFirstName) {
              currentFirstName = "Kullanıcı";
              currentLastName = "";
            }

            const appUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              firstName: currentFirstName,
              lastName: currentLastName || "",
              title: userDataFromFirestore.title,
              organization: userDataFromFirestore.organization,
              roles: userDataFromFirestore.roles || [],
              authorizationLevel: userDataFromFirestore.authorizationLevel,
              photoURL: firebaseUser.photoURL || userDataFromFirestore.photoURL,
            };
            setUser(appUser);
            // console.log("[AuthContext] App user set from Firestore:", appUser.uid);
          } else {
            console.warn(`[AuthContext] User document not found in Firestore for UID: ${firebaseUser.uid}. Logging out.`);
            await firebaseSignOut(auth);
            setUser(null);
          }
        } catch (error: Error) {
          console.error("[AuthContext] Error processing Firebase user:", error.message);
          await firebaseSignOut(auth);
          setUser(null);
        }
      } else {
        // console.log("[AuthContext] No Firebase user from onAuthStateChanged. Setting app user to null.");
        setUser(null);
      }
      setLoading(false);
      // console.log("[AuthContext] onAuthStateChanged finished. Loading:", loading, "App User UID:", user ? user.uid : 'null');
    });

    return () => {
      // console.log("[AuthContext] onAuthStateChanged listener cleanup.");
      unsubscribe();
    }
  }, []); // Empty dependency array is correct here.

  useEffect(() => {
    // console.log("[AuthContext] Auth state/path effect. Loading:", loading, "User:", user ? user.uid : 'null', "Pathname:", pathname);
    if (!loading) {
      if (!user && pathname !== '/login') {
        // console.log("[AuthContext] Redirecting to /login (no user, not on login page).");
        router.replace('/login');
      } else if (user && pathname === '/login') {
        // console.log("[AuthContext] Redirecting to /dashboard (user exists, on login page).");
        router.replace('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: Error) {
      console.error("[AuthContext] Login failed:", error.code, error.message);
      setUser(null); 
      setLoading(false);
      throw error; 
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      router.replace('/login'); // Use replace to avoid back button issues
    } catch (error: any) {
      console.error("[AuthContext] Logout failed:", error.code, error.message);
    }
  }, [router]);

  const isAdminOrMarketingManager = user?.roles.includes('Admin') || user?.roles.includes('Pazarlama Müdürü') || false;
  
  const getDisplayName = (): string => {
    if (!user) return "Kullanıcı";
    return `${user.firstName} ${user.lastName}`.trim();
  };

  if (loading && pathname !== '/login') {
    return <div className="flex h-screen items-center justify-center"><p>Yükleniyor...</p></div>;
  }
  
  if (!loading && !user && pathname !== '/login') {
     return <div className="flex h-screen items-center justify-center"><p>Yönlendiriliyor...</p></div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdminOrMarketingManager, getDisplayName }}>
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
