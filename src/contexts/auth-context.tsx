
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
  }, []);

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
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: any) {
      console.error("[AuthContext] Login failed in signInWithEmailAndPassword. Error message:", error.message, "Error code:", error.code, "Stack:", error.stack);
      setUser(null); // Ensure user is null on failed login attempt before onAuthStateChanged might run
      setLoading(false); // Explicitly set loading to false here
      throw error; // Re-throw the error to be caught by the calling component
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("[AuthContext] Logout attempt.");
    try {
      await firebaseSignOut(auth);
      console.log("[AuthContext] firebaseSignOut successful.");
      setUser(null); // Explicitly set user to null
      // onAuthStateChanged will also set user to null, but this makes it immediate
      router.replace('/login');
    } catch (error: any) {
      console.error("[AuthContext] Logout failed. Error:", error.message, error.code);
    } finally {
       // setLoading(false) will be handled by onAuthStateChanged if it triggers,
       // or if not, it should be false from previous state or login failure
       console.log("[AuthContext] Logout function finished.");
    }
  }, [router]);

  const isAdminOrMarketingManager = user?.roles.includes('Admin') || user?.roles.includes('Pazarlama Müdürü') || false;
  
  const getDisplayName = (): string => {
    if (!user) return "Kullanıcı";
    return `${user.firstName} ${user.lastName}`.trim();
  };

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
