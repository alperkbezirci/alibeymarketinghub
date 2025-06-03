// src/app/login/page.tsx
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/auth-context';
import { AppLogo } from '@/components/layout/app-logo'; 
import { AppLogotype } from '@/components/layout/app-logotype';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { GlobalLoader } from '@/components/layout/global-loader'; // GlobalLoader import edildi

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isLoading to avoid conflict
  const { login, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  // If AuthProvider is still checking auth state, show global loader
  if (authLoading) {
     return <GlobalLoader />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4 pt-8">
          <AppLogo className="h-16 w-auto text-primary mx-auto" /> 
          <AppLogotype className="h-7 w-auto text-foreground mx-auto" /> 
          <CardDescription className="pt-2">Pazarlama Yönetim Platformuna Hoş Geldiniz</CardDescription>
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting || authLoading}>
              {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Giriş Yap
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center pb-8">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Ali Bey Hotels & Resorts. Tüm hakları saklıdır.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
