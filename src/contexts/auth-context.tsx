// src/contexts/auth-context.tsx
"use client";

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User as FirebaseAuthUser, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { GlobalLoader } from '@/components/layout/global-loader'; // Ensure GlobalLoader is used

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
          } else {
            console.warn(`[AuthContext] User document not found in Firestore for UID: ${firebaseUser.uid}. Logging out.`);
            await firebaseSignOut(auth); // Ensure user is signed out from Firebase Auth
            setUser(null);
          }
        } catch (error: unknown) {
          let message = "Bilinmeyen bir Firebase kullanıcı işleme hatası.";
          if (error instanceof Error) message = error.message;
          console.error("[AuthContext] Error processing Firebase user:", message);
          await firebaseSignOut(auth); // Ensure user is signed out on error
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) {
      return; // Wait until loading is false
    }

    if (!user && pathname !== '/login') {
      router.replace('/login');
    } else if (user && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: unknown) {
      let code = "UNKNOWN_ERROR";
      let message = "Giriş yapılırken bilinmeyen bir hata oluştu.";
      if (error instanceof Error && 'code' in error) {
        code = (error as {code: string}).code;
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }
      console.error("[AuthContext] Login failed:", code, message);
      setUser(null); 
      setLoading(false);
      throw error; // Re-throw the original error so the login page can handle it
    }
  }, [setLoading, setUser]); // Added setLoading and setUser to dependencies

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      router.replace('/login'); 
    } catch (error: unknown) {
      let code = "UNKNOWN_LOGOUT_ERROR";
      let message = "Çıkış yapılırken bilinmeyen bir hata oluştu.";
      if (error instanceof Error && 'code' in error) {
        code = (error as {code: string}).code;
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }
      console.error("[AuthContext] Logout failed:", code, message);
    }
  }, [router, setUser]); // Added setUser to dependencies

  const isAdminOrMarketingManager = user?.roles?.includes('Admin') || user?.roles?.includes('Pazarlama Müdürü') || false;
  
  const getDisplayName = (): string => {
    if (!user) return "Kullanıcı";
    return `${user.firstName} ${user.lastName}`.trim();
  };
  
  // This initial loading state handling is crucial.
  // It prevents rendering children or redirecting before auth state is determined.
  if (loading) {
    return <GlobalLoader />;
  }
  
  // If not loading and no user, and not on login page, AuthProvider's useEffect will redirect.
  // Children should only be rendered if user is authenticated or if it's the login page itself.
  if (!user && pathname !== '/login') {
    // This state should ideally be very short-lived as the useEffect above will redirect.
    // Rendering GlobalLoader here prevents brief flashes of content before redirect.
    return <GlobalLoader message="Yönlendiriliyor..." />;
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
