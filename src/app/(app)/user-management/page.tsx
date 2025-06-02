
// src/app/(app)/user-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, type User } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Edit3, Trash2, UserCog, UserPlus, Loader2, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAllUsers, createUserDocumentInFirestore } from '@/services/user-service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // Removed AlertDialogTrigger import as it's not needed here
import { AddUserForm } from '@/components/user-management/add-user-form';
import { EditUserForm } from '@/components/user-management/edit-user-form';
import { handleDeleteUserAction } from './actions';


export default function UserManagementPage() {
  const { user: currentUser, isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  
  const [isCreatingAlperProfile, setIsCreatingAlperProfile] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error: any) {
      setUsersError(error.message || "Kullanıcılar yüklenirken bir hata oluştu.");
      toast({ title: "Hata", description: error.message || "Kullanıcılar yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdminOrMarketingManager) {
      fetchUsers();
    }
  }, [isAdminOrMarketingManager, fetchUsers]);

  const handleCreateAlperFirestoreProfile = async () => {
    setIsCreatingAlperProfile(true);
    const alperUID = "XbjLMMC2ihdHjg2TBecCSdyOwKB3";
    const alperEmail = "akucukbezirci@alibey.com";
    const alperName = "Alper Küçükbezirci";
    const alperRoles = ["Pazarlama Müdürü", "Admin"];
    try {
      await createUserDocumentInFirestore(alperUID, alperEmail, alperName, alperRoles);
      toast({
        title: "Profil Oluşturuldu",
        description: `${alperName} için Firestore kullanıcı profili başarıyla oluşturuldu/güncellendi.`,
      });
      if(isAdminOrMarketingManager) fetchUsers();
    } catch (error: any) {
      toast({
        title: "Profil Oluşturma Hatası",
        description: error.message || "Alper Küçükbezirci için Firestore profili oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAlperProfile(false);
    }
  };

  const openEditDialog = (userToEdit: User) => {
    setSelectedUserToEdit(userToEdit);
    setIsEditUserDialogOpen(true);
  };
  
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    
    const result = await handleDeleteUserAction(userToDelete.uid, userToDelete.name);

    if (result.success) {
        toast({ title: "Başarılı", description: result.message });
        fetchUsers(); 
    } else {
        toast({ title: "Hata", description: result.message, variant: "destructive" });
    }
    setUserToDelete(null);
    setIsDeletingUser(false);
  };


  if (!isAdminOrMarketingManager) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <h1 className="text-3xl font-headline font-bold">Kullanıcı Yönetimi</h1>
        </div>
        <Card className="bg-secondary/30 border-primary/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <UserPlus className="mr-2 h-5 w-5 text-primary" /> Özel Kullanıcı Profili Oluşturma
            </CardTitle>
            <CardDescription className="text-xs">
              Bu bölüm, Alper Küçükbezirci (UID: XbjLMMC2ihdHjg2TBecCSdyOwKB3) için Firestore profil belgesini manuel olarak oluşturmak/güncellemek içindir.
              Bu işlem, ilk yönetici kullanıcısının sisteme dahil edilmesini sağlar. Profil oluşturulduktan sonra normal şekilde giriş yapabilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCreateAlperFirestoreProfile} 
              disabled={isCreatingAlperProfile}
              variant="outline"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isCreatingAlperProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alper K. Profilini Firestore'a Ekle/Güncelle
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              UID: XbjLMMC2ihdHjg2TBecCSdyOwKB3, E-posta: akucukbezirci@alibey.com, Roller: Pazarlama Müdürü, Admin
            </p>
          </CardContent>
        </Card>
         <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg p-8">
          <UserCog className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Erişim Kısıtlı</h1>
          <p className="text-muted-foreground">Sayfanın geri kalanını görüntülemek için yönetici olarak giriş yapmalısınız. <br/> Eğer Alper Küçükbezirci iseniz ve Firestore profiliniz henüz oluşturulmadıysa, lütfen yukarıdaki butonu kullanın.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-headline font-bold">Kullanıcı Yönetimi</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={isLoadingUsers} title="Kullanıcı listesini yenile">
            {isLoadingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Kullanıcı Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">Yeni Kullanıcı Ekle</DialogTitle>
                <DialogDescription>Yeni bir kullanıcı oluşturun ve rollerini atayın.</DialogDescription>
              </DialogHeader>
              <AddUserForm 
                onSuccess={() => { setIsAddUserDialogOpen(false); fetchUsers(); }}
                onClose={() => setIsAddUserDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card className="bg-secondary/30 border-primary/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center">
            <UserPlus className="mr-2 h-5 w-5 text-primary" /> Özel Kullanıcı Profili Oluşturma (Alper K.)
          </CardTitle>
          <CardDescription className="text-xs">
            Alper Küçükbezirci (UID: XbjLMMC2ihdHjg2TBecCSdyOwKB3) için Firestore profil belgesini oluşturur/günceller.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCreateAlperFirestoreProfile} 
            disabled={isCreatingAlperProfile}
            variant="outline"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            size="sm"
          >
            {isCreatingAlperProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Alper K. Profilini Oluştur/Güncelle
          </Button>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Kullanıcı Listesi</CardTitle>
          <CardDescription>Sistemdeki kayıtlı kullanıcılar ve rolleri.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Kullanıcılar yükleniyor...</p>
            </div>
          )}
          {usersError && !isLoadingUsers && (
            <p className="text-destructive text-center py-4">{usersError}</p>
          )}
          {!isLoadingUsers && !usersError && users.length === 0 && (
            <p className="text-muted-foreground text-center py-4">Sistemde kayıtlı kullanıcı bulunmamaktadır.</p>
          )}
          {!isLoadingUsers && !usersError && users.length > 0 && (
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
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(role => <Badge key={role} variant="secondary">{role}</Badge>)}
                        {user.roles.length === 0 && <Badge variant="outline">Rol Atanmamış</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} disabled={user.uid === currentUser?.uid /* Admin kendini düzenleyemesin (opsiyonel) */}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => setUserToDelete(user)} disabled={user.uid === currentUser?.uid /* Admin kendini silemesin */}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedUserToEdit && (
        <Dialog open={isEditUserDialogOpen} onOpenChange={(open) => {
          if (!open) setSelectedUserToEdit(null);
          setIsEditUserDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Kullanıcıyı Düzenle</DialogTitle>
              <DialogDescription>{selectedUserToEdit.name} kullanıcısının bilgilerini güncelleyin.</DialogDescription>
            </DialogHeader>
            <EditUserForm 
              user={selectedUserToEdit}
              onSuccess={() => { setIsEditUserDialogOpen(false); fetchUsers(); setSelectedUserToEdit(null); }}
              onClose={() => { setIsEditUserDialogOpen(false); setSelectedUserToEdit(null); }}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Silmek Üzeresiniz</AlertDialogTitle>
            <AlertDialogDescription>
              "{userToDelete?.name}" adlı kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem kullanıcının Firestore verilerini silecektir.
              <br />
              <strong className="text-destructive">Firebase Authentication kaydının silinmesi Admin SDK gerektirir ve bu arayüzden tam olarak yapılamayabilir.</strong>
              <br />
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeletingUser}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} disabled={isDeletingUser} className={buttonVariants({variant: "destructive"})}>
              {isDeletingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
