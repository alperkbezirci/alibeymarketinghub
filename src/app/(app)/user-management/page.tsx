// src/app/(app)/user-management/page.tsx
"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit3, Trash2, UserCog } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Placeholder user data
const sampleUsers = [
  { id: "1", name: "Alper Küçükbezirci", email: "akucukbezirci@alibey.com", roles: ["Admin", "Pazarlama Müdürü"] },
  { id: "2", name: "Ayşe Yılmaz", email: "ayilmaz@alibey.com", roles: ["Ekip Üyesi"] },
  { id: "3", name: "Mehmet Öztürk", email: "mozturk@alibey.com", roles: ["Ekip Üyesi"] },
];

export default function UserManagementPage() {
  const { isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold">Kullanıcı Yönetimi</h1>
        <Button onClick={() => handleAction('Yeni', 'Kullanıcı')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Yeni Kullanıcı Ekle
        </Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Kullanıcı Listesi</CardTitle>
          <CardDescription>Sistemdeki kayıtlı kullanıcılar ve rolleri.</CardDescription>
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
