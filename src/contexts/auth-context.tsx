
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
    console.log("[AuthContext] onAuthStateChanged listener setup.");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseAuthUser | null) => {
      console.log("[AuthContext] onAuthStateChanged triggered. Firebase user UID:", firebaseUser ? firebaseUser.uid : 'null');
      if (firebaseUser) {
        try {
          console.log("[AuthContext] Firebase user exists. Fetching user doc from Firestore for UID:", firebaseUser.uid);
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userDataFromFirestore = userDocSnap.data();
            console.log("[AuthContext] User document found in Firestore:", userDataFromFirestore);
            const appUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userDataFromFirestore.name || firebaseUser.displayName || "Kullanıcı",
              roles: userDataFromFirestore.roles || [],
              photoURL: firebaseUser.photoURL || userDataFromFirestore.photoURL,
            };
            setUser(appUser);
            console.log("[AuthContext] App user set:", appUser);
          } else {
            console.warn(`[AuthContext] User document not found in Firestore for UID: ${firebaseUser.uid}. Logging out.`);
            await firebaseSignOut(auth);
            setUser(null);
          }
        } catch (error: any) {
          console.error("[AuthContext] Error in onAuthStateChanged while processing Firebase user:", error.message, error.code, error.stack);
          await firebaseSignOut(auth);
          setUser(null);
        }
      } else {
        console.log("[AuthContext] No Firebase user in onAuthStateChanged. Setting app user to null.");
        setUser(null);
      }
      setLoading(false);
      console.log("[AuthContext] onAuthStateChanged finished. Loading set to false. Current app user:", user ? user.uid : 'null');
    });

    return () => {
      console.log("[AuthContext] onAuthStateChanged listener cleanup.");
      unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial user state 'user' is not a dependency here.

  useEffect(() => {
    console.log("[AuthContext] Pathname/User/Loading effect triggered. Loading:", loading, "User:", user ? user.uid : 'null', "Pathname:", pathname);
    if (!loading) {
      if (!user && pathname !== '/login') {
        console.log("[AuthContext] No user, not on login page. Redirecting to /login.");
        router.replace('/login');
      } else if (user && pathname === '/login') {
        console.log("[AuthContext] User exists, on login page. Redirecting to /dashboard.");
        router.replace('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    console.log(`[AuthContext] Login attempt for email: ${email}`);
    setLoading(true);
    try {
      console.log("[AuthContext] Calling signInWithEmailAndPassword...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("[AuthContext] signInWithEmailAndPassword successful. UserCredential:", userCredential?.user?.uid);
      // onAuthStateChanged will handle setting user and redirecting, setLoading(false)
    } catch (error: any) {
      console.error("[AuthContext] Login failed in signInWithEmailAndPassword. Error message:", error.message, "Error code:", error.code, "Stack:", error.stack);
      setUser(null);
      setLoading(false);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("[AuthContext] Logout attempt.");
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      console.log("[AuthContext] firebaseSignOut successful.");
      // onAuthStateChanged will handle setting user to null
      router.replace('/login');
    } catch (error: any) {
      console.error("[AuthContext] Logout failed. Error:", error.message, error.code);
    } finally {
      // setLoading(false) will be handled by onAuthStateChanged
       console.log("[AuthContext] Logout function finished.");
    }
  }, [router]);

  const isAdminOrMarketingManager = user?.roles.includes('Admin') || user?.roles.includes('Pazarlama Müdürü') || false;
  
  if (loading && pathname !== '/login') {
    console.log("[AuthContext] Render: Global loading screen (loading and not on login page).");
    return <div className="flex h-screen items-center justify-center"><p>Yükleniyor...</p></div>;
  }
  
  if (!loading && !user && pathname !== '/login') {
    console.log("[AuthContext] Render: Global redirecting screen (not loading, no user, not on login page).");
     return <div className="flex h-screen items-center justify-center"><p>Yönlendiriliyor...</p></div>;
  }

  console.log("[AuthContext] Render: Providing context. User:", user ? user.uid : 'null', "Loading:", loading);
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
