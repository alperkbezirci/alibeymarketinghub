// src/app/login/page.tsx
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/auth-context';
import { Mountain, Loader2, UserPlus } from 'lucide-react'; // Added UserPlus
import { useToast } from "@/hooks/use-toast";
import { createUserDocumentInFirestore } from '@/services/user-service'; // Import the service

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAlperProfile, setIsCreatingAlperProfile] = useState(false); // New state for special button
  const { login, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      // Navigation is handled by AuthProvider's useEffect
    } catch (error: any) {
      console.error("Login page error catch:", error.message);
      let errorMessage = "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "E-posta veya şifre hatalı.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Geçersiz e-posta formatı.";
      }
      toast({
        title: "Giriş Başarısız",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Special function to create Alper K.'s Firestore profile
  const handleCreateAlperFirestoreProfile = async () => {
    setIsCreatingAlperProfile(true);
    const alperUID = "XbjLMMC2ihdHjg2TBecCSdyOwKB3"; // UID confirmed by user
    const alperEmail = "akucukbezirci@alibey.com";
    const alperName = "Alper Küçükbezirci";
    const alperRoles = ["Pazarlama Müdürü", "Admin"];

    try {
      await createUserDocumentInFirestore(alperUID, alperEmail, alperName, alperRoles);
      toast({
        title: "Profil Oluşturuldu",
        description: `${alperName} için Firestore kullanıcı profili başarıyla oluşturuldu/güncellendi. Artık giriş yapmayı deneyebilirsiniz.`,
      });
    } catch (error: any) {
      console.error("Error creating Alper K. Firestore profile:", error);
      toast({
        title: "Profil Oluşturma Hatası",
        description: error.message || "Alper Küçükbezirci için Firestore profili oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAlperProfile(false);
    }
  };

  if (authLoading && !isLoading) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 inline-flex items-center justify-center">
             <Mountain className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Ali Bey Marketing Hub</CardTitle>
          <CardDescription>Pazarlama Yönetim Platformuna Hoş Geldiniz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@alibey.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-base"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading || authLoading}>
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Giriş Yap
            </Button>
          </form>

          {/* Temporary button to create Alper K.'s Firestore profile */}
          <Card className="mt-6 bg-secondary/30 border-primary/50">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-base font-semibold flex items-center">
                <UserPlus className="mr-2 h-5 w-5 text-primary" /> Özel Kullanıcı Profili Kurulumu
              </CardTitle>
              <CardDescription className="text-xs">
                Bu bölüm, Alper Küçükbezirci (UID: XbjLMMC2ihdHjg2TBecCSdyOwKB3) için Firestore profilini oluşturmak/güncellemek içindir.
                Bu işlem, ilk yönetici kullanıcısının sisteme dahil edilmesini sağlar.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <Button 
                onClick={handleCreateAlperFirestoreProfile} 
                disabled={isCreatingAlperProfile}
                variant="outline"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isCreatingAlperProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alper K. Profilini Firestore'a Ekle/Güncelle
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                E-posta: akucukbezirci@alibey.com, Roller: Pazarlama Müdürü, Admin
              </p>
            </CardContent>
          </Card>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Ali Bey Hotels & Resorts. Tüm hakları saklıdır.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
