// src/app/login/page.tsx
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/auth-context';
import { Mountain } from 'lucide-react'; // Placeholder for logo

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Password not used in mock auth but good for form structure
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 inline-flex items-center justify-center">
             <Mountain className="h-10 w-10 text-primary" /> {/* Placeholder Logo */}
          </div>
          <CardTitle className="text-3xl font-headline">Ali Bey Marketing Hub</CardTitle>
          <CardDescription>Pazarlama Yönetim Platformuna Hoş Geldiniz</CardDescription>
        </CardHeader>
        <CardContent>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <Button type="submit" className="w-full text-lg py-6">
              Giriş Yap
            </Button>
          </form>
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
