
// src/app/(app)/user-management/page.tsx
"use client";

import React, { useState } from 'react'; // Added useState
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit3, Trash2, UserCog, UserPlus, Loader2 } from "lucide-react"; // Added UserPlus, Loader2
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createUserDocumentInFirestore } from '@/services/user-service'; // Import the service

// Placeholder user data
const sampleUsers = [
  { id: "XbjLMMC2ihdHjg2TBecCSdyOwKB3", name: "Alper Küçükbezirci", email: "akucukbezirci@alibey.com", roles: ["Pazarlama Müdürü", "Admin"] },
  { id: "2", name: "Ayşe Yılmaz", email: "ayilmaz@alibey.com", roles: ["Ekip Üyesi"] },
  { id: "3", name: "Mehmet Öztürk", email: "mozturk@alibey.com", roles: ["Ekip Üyesi"] },
];

export default function UserManagementPage() {
  const { isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();
  const [isCreatingAlperProfile, setIsCreatingAlperProfile] = useState(false);

  if (!isAdminOrMarketingManager) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <UserCog className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Erişim Reddedildi</h1>
        <p className="text-muted-foreground">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }

  const handleAction = (action: string, userName: string) => {
    toast({ title: `${action} Kullanıcı`, description: `${userName} için ${action.toLowerCase()} işlemi simüle edildi.` });
  };

  const handleCreateAlperFirestoreProfile = async () => {
    setIsCreatingAlperProfile(true);
    const alperUID = "XbjLMMC2ihdHjg2TBecCSdyOwKB3";
    const alperEmail = "akucukbezirci@alibey.com";
    const alperName = "Alper Küçükbezirci";
    const alperRoles = ["Pazarlama Müdürü", "Admin"];
    // Fotoğraf URL'si opsiyonel olduğu için şimdilik eklemiyoruz. İstenirse eklenebilir.
    // const alperPhotoURL = null; 

    try {
      await createUserDocumentInFirestore(alperUID, alperEmail, alperName, alperRoles /*, alperPhotoURL */);
      toast({
        title: "Profil Oluşturuldu",
        description: `${alperName} için Firestore kullanıcı profili başarıyla oluşturuldu/güncellendi.`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-headline font-bold">Kullanıcı Yönetimi</h1>
        <div className="flex space-x-2">
          <Button onClick={() => handleAction('Yeni', 'Kullanıcı')}>
            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Kullanıcı Ekle
          </Button>
        </div>
      </div>

      {/* Geçici Buton - Alper Küçükbezirci için Firestore Profili Oluşturma */}
      <Card className="bg-secondary/30 border-primary/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center">
            <UserPlus className="mr-2 h-5 w-5 text-primary" /> Özel Kullanıcı Profili Oluşturma
          </CardTitle>
          <CardDescription className="text-xs">
            Bu bölüm, belirli kullanıcılar için Firestore profil belgelerini manuel olarak oluşturmak/güncellemek içindir.
            İşlem tamamlandıktan sonra bu buton kaldırılabilir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCreateAlperFirestoreProfile} 
            disabled={isCreatingAlperProfile}
            variant="outline"
          >
            {isCreatingAlperProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Alper K. Profilini Firestore'a Ekle/Güncelle
          </Button>
           <p className="text-xs text-muted-foreground mt-2">
            UID: XbjLMMC2ihdHjg2TBecCSdyOwKB3, E-posta: akucukbezirci@alibey.com, Roller: Pazarlama Müdürü, Admin
          </p>
        </CardContent>
      </Card>
      {/* Geçici Buton Sonu */}
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Kullanıcı Listesi (Örnek Veri)</CardTitle>
          <CardDescription>Sistemdeki kayıtlı kullanıcılar ve rolleri (Bu liste örnektir, Firestore'dan gelmemektedir).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Roller</TableHead>
                <TableHead className="text-right">Eylemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map(role => <Badge key={role} variant="secondary">{role}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleAction('Düzenle', user.name)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleAction('Sil', user.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
