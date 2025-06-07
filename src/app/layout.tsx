import React from 'react';
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Ali Bey Marketing Hub',
  description: 'Ali Bey Hotels & Resorts Pazarlama Yönetim Platformu',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {/* AuthProvider içindeki loading state'i için bir fallback gösterilebilir.
                Ancak AuthProvider'ın kendisi zaten bir loading state yönetiyor.
                Bu örnekte, AuthProvider'ın children'ı doğrudan render ediyoruz.
                AuthProvider kendi içinde GlobalLoader'ı kullanacak şekilde güncellenebilir
                veya burada sarmalayıcı bir React.Suspense ile birlikte kullanılabilir.
                Şimdilik AuthProvider'ın kendi iç mantığına güveniyoruz.
            */}
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
