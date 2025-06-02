
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddUserForm } from '@/components/user-management/add-user-form';
import { EditUserForm } from '@/components/user-management/edit-user-form';
import { handleDeleteUserAction } from './actions';
import { AUTHORIZATION_LEVELS, HOTEL_NAMES, USER_ROLES } from '@/lib/constants';


export default function UserManagementPage() {
  const { user: currentUser, isAdminOrMarketingManager, getDisplayName } = useAuth();
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
    
    let targetUID = "XbjLMMC2ihdHjg2TBecCSdyOwKB3"; // Default/fallback UID
    const alperEmail = "akucukbezirci@alibey.com";
    
    // If the currently logged-in user is Alper K., use their actual UID.
    if (currentUser && currentUser.email === alperEmail) {
      targetUID = currentUser.uid;
      console.log(`[UserManagementPage] Alper K. logged in. Using actual UID: ${targetUID} for Firestore profile.`);
    } else {
      console.warn(`[UserManagementPage] Creating Alper K. profile, but current user is not akucukbezirci@alibey.com or not logged in. Using fallback UID: ${targetUID}. This might be an issue if Alper K.'s Auth UID is different.`);
    }

    const alperFirstName = "Alper";
    const alperLastName = "Küçükbezirci";
    const alperRoles = [USER_ROLES.MARKETING_MANAGER, USER_ROLES.ADMIN];
    const alperTitle = "Pazarlama Müdürü";
    const alperOrganization = HOTEL_NAMES.find(h => h.includes("Resort")) || HOTEL_NAMES[0];
    const alperAuthLevel = AUTHORIZATION_LEVELS.find(level => level.includes("Tam Yetki")) || AUTHORIZATION_LEVELS[AUTHORIZATION_LEVELS.length -1];

    try {
      await createUserDocumentInFirestore(
        targetUID, 
        alperEmail, 
        alperFirstName, 
        alperLastName, 
        alperRoles,
        alperTitle,
        alperOrganization,
        alperAuthLevel
      );
      toast({
        title: "Profil Oluşturuldu/Güncellendi",
        description: `${alperFirstName} ${alperLastName} için Firestore kullanıcı profili başarıyla oluşturuldu/güncellendi. Değişikliklerin tam olarak yansıması için lütfen sayfayı yenileyin veya yeniden giriş yapın.`,
        duration: 7000,
      });
      // fetchUsers will be called by useEffect if isAdminOrMarketingManager becomes true after context update
      // For immediate effect, user might need to re-login or context needs a way to force refresh roles.
    } catch (error: any) {
      toast({
        title: "Profil Oluşturma Hatası",
        description: error.message || `${alperFirstName} ${alperLastName} için Firestore profili oluşturulurken bir hata oluştu.`,
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
    
    const userFullName = `${userToDelete.firstName} ${userToDelete.lastName}`;
    const result = await handleDeleteUserAction(userToDelete.uid, userFullName);

    if (result.success) {
        toast({ title: "Başarılı", description: result.message });
        fetchUsers(); 
    } else {
        toast({ title: "Hata", description: result.message, variant: "destructive" });
    }
    setUserToDelete(null);
    setIsDeletingUser(false);
  };


  if (!isAdminOrMarketingManager && !isCreatingAlperProfile) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <h1 className="text-3xl font-headline font-bold">Kullanıcı Yönetimi</h1>
        </div>
        <Card className="bg-secondary/30 border-primary/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center">
              <UserPlus className="mr-2 h-5 w-5 text-primary" /> Özel Yönetici Profili Oluşturma
            </CardTitle>
            <CardDescription className="text-xs">
              Bu bölüm, `akucukbezirci@alibey.com` e-posta adresli yönetici kullanıcısı için Firestore profil belgesini manuel olarak oluşturmak/güncellemek içindir.
              Bu işlem, ilk yönetici kullanıcısının sisteme tam yetkiyle dahil edilmesini sağlar. Lütfen önce Firebase Authentication üzerinden bu kullanıcıyı oluşturduğunuzdan emin olun.
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
              Yönetici (Alper K.) Profilini Firestore'a Ekle/Güncelle
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Hedef e-posta: akucukbezirci@alibey.com. UID, giriş yapan kullanıcıdan alınacaktır.
            </p>
          </CardContent>
        </Card>
         <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg p-8">
          <UserCog className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Erişim Kısıtlı</h1>
          <p className="text-muted-foreground">Sayfanın geri kalanını görüntülemek için yönetici olarak giriş yapmalısınız. <br/> Eğer `akucukbezirci@alibey.com` ile giriş yaptıysanız ve Firestore profiliniz henüz oluşturulmadıysa, lütfen yukarıdaki butonu kullanın.</p>
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
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">Yeni Kullanıcı Ekle</DialogTitle>
                <DialogDescription>Yeni bir kullanıcı oluşturun ve detaylarını atayın.</DialogDescription>
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
            <UserPlus className="mr-2 h-5 w-5 text-primary" /> Özel Yönetici Profili Oluşturma (Alper K.)
          </CardTitle>
          <CardDescription className="text-xs">
            `akucukbezirci@alibey.com` kullanıcısı için Firestore profil belgesini oluşturur/günceller. Eğer bu kullanıcı sizseniz ve henüz profiliniz yoksa bu butonu kullanabilirsiniz.
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
            Yönetici (Alper K.) Profilini Oluştur/Güncelle
          </Button>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Kullanıcı Listesi</CardTitle>
          <CardDescription>Sistemdeki kayıtlı kullanıcılar ve detayları.</CardDescription>
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
                  <TableHead>Ünvan</TableHead>
                  <TableHead>Kurum</TableHead>
                  <TableHead>Roller</TableHead>
                  <TableHead>Yetki Seviyesi</TableHead>
                  <TableHead className="text-right">Eylemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{`${user.firstName} ${user.lastName}`}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.title || '-'}</TableCell>
                    <TableCell>{user.organization || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? 
                          user.roles.map(role => <Badge key={role} variant="secondary">{role}</Badge>) :
                          <Badge variant="outline">Rol Atanmamış</Badge>
                        }
                      </div>
                    </TableCell>
                    <TableCell>{user.authorizationLevel || '-'}</TableCell>
                    <TableCell className="text-right space-x-1">
                       <Dialog open={selectedUserToEdit?.uid === user.uid && isEditUserDialogOpen} onOpenChange={(open) => {
                          if (!open) setSelectedUserToEdit(null);
                          setIsEditUserDialogOpen(open);
                       }}>
                        <DialogTrigger asChild>
                           <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} 
                            disabled={user.uid === currentUser?.uid && user.roles.includes(USER_ROLES.ADMIN) && users.filter(u => u.roles.includes(USER_ROLES.ADMIN)).length === 1}
                           >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        {selectedUserToEdit?.uid === user.uid && ( // Render form only if this user is selected
                            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                <DialogTitle className="font-headline text-2xl">Kullanıcıyı Düzenle</DialogTitle>
                                <DialogDescription>{`${selectedUserToEdit.firstName} ${selectedUserToEdit.lastName}`} kullanıcısının bilgilerini güncelleyin.</DialogDescription>
                                </DialogHeader>
                                <EditUserForm 
                                user={selectedUserToEdit}
                                onSuccess={() => { setIsEditUserDialogOpen(false); fetchUsers(); setSelectedUserToEdit(null); }}
                                onClose={() => { setIsEditUserDialogOpen(false); setSelectedUserToEdit(null); }}
                                />
                            </DialogContent>
                        )}
                      </Dialog>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => setUserToDelete(user)} 
                        disabled={user.uid === currentUser?.uid || (user.roles.includes(USER_ROLES.ADMIN) && users.filter(u => u.roles.includes(USER_ROLES.ADMIN)).length === 1 && user.uid !== currentUser?.uid) }
                      >
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

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Silmek Üzeresiniz</AlertDialogTitle>
            <AlertDialogDescription>
              "{userToDelete?.firstName} {userToDelete?.lastName}" adlı kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem kullanıcının Firestore verilerini silecektir.
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

    