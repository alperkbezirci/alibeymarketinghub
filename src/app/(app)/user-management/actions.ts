// src/app/(app)/user-management/actions.ts
"use server";

import { admin } from '@/lib/firebase-admin'; // Firebase Admin SDK
import { createUserDocumentInFirestore, deleteUserDocument, updateUserProfile } from "@/services/user-service";

interface AddUserResult {
  success: boolean;
  message: string;
  uid?: string;
}

// GERÇEK ÜRETİM İÇİN KRİTİK UYARI:
// Bu fonksiyon, sunucu tarafında güvenli bir şekilde işlemi yapan kullanıcının
// kimliğini ve yönetici yetkilerini doğrulamalıdır.
// Firebase Admin SDK'nın `auth().verifyIdToken()` metodu ve özel claim'ler veya
// Firestore'dan güvenli rol sorgulaması bu amaçla kullanılabilir.
// Aşağıdaki `return false;` satırı, GÜVENLİ BİR YETKİLENDİRME MEKANİZMASI
// EKLEYENE KADAR BU EYLEMLERİN ÇALIŞMASINI ENGELLEMEK İÇİNDİR.
async function checkAdminPrivileges(idToken?: string | null): Promise<boolean> {
  // TODO: ÜRETİM İÇİN GÜVENLİ YETKİLENDİRME UYGULAYIN
  // Örnek (ID Token ile):
  // if (!idToken) return false;
  // try {
  //   const decodedToken = await admin.auth().verifyIdToken(idToken);
  //   // decodedToken.roles (custom claim) veya decodedToken.uid ile Firestore'dan rol kontrolü yapın.
  //   // return decodedToken.roles?.includes(USER_ROLES.ADMIN);
  //   return true; // Gerçek kontrolü uygulayın
  // } catch (error) {
  //   console.error("Admin privilege check failed:", error);
  //   return false;
  // }
  console.error("SECURITY_RISK: `checkAdminPrivileges` in user-management/actions.ts needs a PROPER SERVER-SIDE implementation for production. Action will be blocked.");
  return false; // GÜVENLİ BİR KONTROL UYGULANANA KADAR false DÖNDÜRÜN.
}


export async function handleAddUserAction(formData: FormData): Promise<AddUserResult> {
  // const idToken = formData.get('idToken') as string | null; // Formdan ID token al (istemci sağlamalı)
  // const isAdmin = await checkAdminPrivileges(idToken); // ID Token'ı kontrole gönder
  const isAdmin = await checkAdminPrivileges(); // Şimdilik ID Token olmadan çağırıyoruz, bu da false dönecek
  if (!isAdmin) {
    return { success: false, message: "Bu işlemi gerçekleştirmek için yönetici yetkiniz bulunmamaktadır veya yetki kontrolü düzgün yapılandırılmamıştır." };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const title = formData.get("title") as string | undefined;
  const organization = formData.get("organization") as string | undefined;
  const roles = formData.getAll("roles") as string[];
  const authorizationLevel = formData.get("authorizationLevel") as string | undefined;

  if (!email || !password || !firstName || !lastName || roles.length === 0 || !authorizationLevel) {
    return { success: false, message: "Lütfen tüm zorunlu alanları (E-posta, Şifre, İsim, Soyisim, Rol, Yetki Seviyesi) doldurun." };
  }

  try {
    // Step 1: Create user in Firebase Authentication using Admin SDK
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: `${firstName} ${lastName}`,
      // photoURL: "..." // Opsiyonel
    });
    
    // İsteğe bağlı: Özel claim'ler ile rolleri ayarlayabilirsiniz.
    // await admin.auth().setCustomUserClaims(userRecord.uid, { roles: roles });

    // Step 2: Create user document in Firestore
    await createUserDocumentInFirestore(
        userRecord.uid, 
        email, 
        firstName, 
        lastName, 
        roles, 
        title, 
        organization, 
        authorizationLevel
    );
    
    return { success: true, message: `"${firstName} ${lastName}" adlı kullanıcı başarıyla oluşturuldu.`, uid: userRecord.uid };
  } catch (error: unknown) {
    console.error("Error adding new user via Admin SDK:", error);
    let errorMessage = "Kullanıcı oluşturulurken bir hata oluştu.";
    if (error.code === "auth/email-already-exists") {
      errorMessage = "Bu e-posta adresi zaten kullanımda.";
    } else if (error.code === "auth/invalid-password" && error.message.includes("6 characters")) {
      errorMessage = "Şifre çok zayıf. Lütfen en az 6 karakterli bir şifre seçin.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Geçersiz e-posta formatı.";
    } // else { errorMessage = "Kullanıcı oluşturulurken bir hata oluştu."; } // Generic message
    return { success: false, message: errorMessage };
  }
}


interface UpdateUserResult {
  success: boolean;
  message: string;
}

export async function handleUpdateUserAction(formData: FormData): Promise<UpdateUserResult> {
  // const idToken = formData.get('idToken') as string | null;
  // const isAdmin = await checkAdminPrivileges(idToken);
  const isAdmin = await checkAdminPrivileges();
  if (!isAdmin) {
    return { success: false, message: "Bu işlemi gerçekleştirmek için yönetici yetkiniz bulunmamaktadır veya yetki kontrolü düzgün yapılandırılmamıştır." };
  }

  const uid = formData.get("uid") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const title = formData.get("title") as string | undefined;
  const organization = formData.get("organization") as string | undefined;
  const roles = formData.getAll("roles") as string[];
  const authorizationLevel = formData.get("authorizationLevel") as string | undefined;


  if (!uid || !firstName || !lastName || roles.length === 0 || !authorizationLevel) {
    return { success: false, message: "Kullanıcı ID, İsim, Soyisim, en az bir Rol ve Yetki Seviyesi zorunludur." };
  }

  try {
    // Update user in Firebase Authentication (Admin SDK for things like displayName if needed)
    await admin.auth().updateUser(uid, {
      displayName: `${firstName} ${lastName}`,
    });

    // Update user profile in Firestore
    await updateUserProfile(uid, firstName, lastName, roles, title, organization, authorizationLevel);

    // İsteğe bağlı: Özel claim'leri de güncelleyebilirsiniz
    // await admin.auth().setCustomUserClaims(uid, { roles: roles });

    return { success: true, message: `"${firstName} ${lastName}" adlı kullanıcının bilgileri güncellendi.` };
  } catch (error: Error) {
    console.error("Error updating user:", error);
    return { success: false, message: error.message || "Kullanıcı güncellenirken bir hata oluştu." };
  }
}

interface DeleteUserResult {
  success: boolean;
  message: string;
}

export async function handleDeleteUserAction(uid: string, userFullName: string): Promise<DeleteUserResult> {
  // const isAdmin = await checkAdminPrivileges(idToken);
  const isAdmin = await checkAdminPrivileges();
  if (!isAdmin) {
    return { success: false, message: "Bu işlemi gerçekleştirmek için yönetici yetkiniz bulunmamaktadır veya yetki kontrolü düzgün yapılandırılmamıştır." };
  }
  
  if (!uid) {
    return { success: false, message: "Kullanıcı ID'si silme işlemi için zorunludur." };
  }
  
  try {
    // Step 1: Delete Firebase Authentication user using Admin SDK
    await admin.auth().deleteUser(uid);
    
    // Step 2: Delete Firestore document
    await deleteUserDocument(uid);
    
    return { success: true, message: `"${userFullName}" kullanıcısı başarıyla sistemden silindi.` };
  } catch (error: unknown) { // Use unknown instead of any
    console.error("Error deleting user:", error); 
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'auth/user-not-found') { // Type assertion for code check
      // Kullanıcı Auth'da bulunamadıysa, Firestore belgesini silmeyi dene.
      try {
        await deleteUserDocument(uid);
        return { success: true, message: `"${userFullName}" kullanıcısının bilgileri kısmen silindi (Auth'da bulunamadı). Firestore belgesi silindi.` };
      } catch (dbError: any) {
        return { success: false, message: `Kullanıcı Auth'da bulunamadı ve Firestore belgesi silinirken hata oluştu: ${dbError.message}` };
      }
    }
    return { success: false, message: `"${userFullName}" kullanıcısı silinirken hata: ${error.message}.` };
  }
}
