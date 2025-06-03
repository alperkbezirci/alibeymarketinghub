
// src/app/(app)/user-management/actions.ts
"use server";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase"; // Client SDK auth
import { createUserDocumentInFirestore, deleteUserDocument, updateUserProfile, getUserRoles } from "@/services/user-service"; // getUserRoles eklendi
// import { auth as adminAuth } from '@/lib/firebase-admin'; // Firebase Admin SDK'nız varsa
// import { USER_ROLES } from '@/lib/constants'; // USER_ROLES eklendi

interface AddUserResult {
  success: boolean;
  message: string;
  uid?: string;
}

// ÖNEMLİ GÜVENLİK NOTU:
// Gerçek bir uygulamada, aşağıdaki `isCurrentUserAdminOnServer` fonksiyonu,
// sunucu tarafında geçerli kullanıcının oturumunu (örneğin, bir çerez veya token aracılığıyla)
// doğrulamalı ve kullanıcının rollerini güvenli bir şekilde (örneğin, Firestore'dan veya özel claim'lerden)
// almalıdır. Bu, client SDK'nın `auth.currentUser` özelliğine dayanmamalıdır çünkü bu sunucu eylemlerinde
// güvenilir bir şekilde kullanılamaz. Firebase Admin SDK veya NextAuth.js gibi bir kütüphane bu amaç için daha uygundur.

// YER TUTUCU: Gerçek sunucu tarafı admin kontrol fonksiyonu
async function checkAdminPrivileges(): Promise<boolean> {
  // Bu fonksiyon, sunucu tarafında kimliği doğrulanmış kullanıcının
  // Admin rolüne sahip olup olmadığını kontrol etmelidir.
  // Örnek:
  // const session = await getServerSession(authOptions); // NextAuth.js örneği
  // if (!session?.user?.id) return false;
  // const userRoles = await getUserRoles(session.user.id); // Firestore'dan rolleri çek
  // return userRoles.includes(USER_ROLES.ADMIN);

  console.warn("SECURITY_WARNING: `checkAdminPrivileges` in user-management/actions.ts is a placeholder and NOT SECURE for production. Implement proper server-side session and role verification.");
  // Şimdilik, bu fonksiyonun her zaman true döndürdüğünü varsayalım (BU GÜVENLİ DEĞİLDİR).
  // GERÇEK UYGULAMADA BU KESİNLİKLE DEĞİŞTİRİLMELİDİR.
  return true;
}


export async function handleAddUserAction(prevState: any, formData: FormData): Promise<AddUserResult> {
  const isAdmin = await checkAdminPrivileges();
  if (!isAdmin) {
    return { success: false, message: "Bu işlemi gerçekleştirmek için yönetici yetkiniz bulunmamaktadır." };
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
    // Step 1: Create user in Firebase Authentication (Client SDK)
    // Sunucu eylemi olduğu için bu işlem doğrudan Admin SDK ile yapılabilir veya
    // istemcinin yaptığı bir kimlik doğrulama sonrası tetiklenebilir.
    // Mevcut yapı Client SDK kullanıyor.
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const authUser = userCredential.user;

    if (!authUser || !authUser.uid) {
      throw new Error("Firebase Authentication kullanıcısı oluşturulamadı.");
    }

    // Step 2: Create user document in Firestore
    await createUserDocumentInFirestore(
        authUser.uid, 
        email, 
        firstName, 
        lastName, 
        roles, 
        title, 
        organization, 
        authorizationLevel
    );
    
    return { success: true, message: `"${firstName} ${lastName}" adlı kullanıcı başarıyla oluşturuldu.`, uid: authUser.uid };
  } catch (error: any) {
    console.error("Error adding new user:", error);
    let errorMessage = "Kullanıcı oluşturulurken bir hata oluştu.";
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "Bu e-posta adresi zaten kullanımda.";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Şifre çok zayıf. Lütfen en az 6 karakterli bir şifre seçin.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Geçersiz e-posta formatı.";
    }
    return { success: false, message: errorMessage };
  }
}


interface UpdateUserResult {
  success: boolean;
  message: string;
}

export async function handleUpdateUserAction(prevState: any, formData: FormData): Promise<UpdateUserResult> {
  const isAdmin = await checkAdminPrivileges();
  if (!isAdmin) {
    return { success: false, message: "Bu işlemi gerçekleştirmek için yönetici yetkiniz bulunmamaktadır." };
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
    await updateUserProfile(uid, firstName, lastName, roles, title, organization, authorizationLevel);
    return { success: true, message: `"${firstName} ${lastName}" adlı kullanıcının bilgileri güncellendi.` };
  } catch (error: any) {
    console.error("Error updating user:", error);
    return { success: false, message: error.message || "Kullanıcı güncellenirken bir hata oluştu." };
  }
}

interface DeleteUserResult {
  success: boolean;
  message: string;
}

export async function handleDeleteUserAction(uid: string, userFullName: string): Promise<DeleteUserResult> {
  const isAdmin = await checkAdminPrivileges();
  if (!isAdmin) {
    return { success: false, message: "Bu işlemi gerçekleştirmek için yönetici yetkiniz bulunmamaktadır." };
  }
  
  if (!uid) {
    return { success: false, message: "Kullanıcı ID'si silme işlemi için zorunludur." };
  }
  
  try {
    // Step 1: Delete Firestore document
    await deleteUserDocument(uid);

    // Step 2: Delete Firebase Authentication user
    // ÖNEMLİ GÜVENLİK NOTU: Firebase Authentication kullanıcısını silmek için Firebase Admin SDK gereklidir.
    // İstemci SDK'sı (mevcut 'auth' nesnesi) başka bir kullanıcıyı silemez.
    // Bu işlem sunucu tarafında Admin SDK ile yapılmalıdır.
    // Örnek: await adminAuth.deleteUser(uid);
    console.warn(`TODO: Firebase Auth kullanıcısı (UID: ${uid}) silme işlemi Admin SDK gerektirir ve burada tam olarak uygulanamamıştır. Sadece Firestore belgesi silindi.`);
    
    return { success: true, message: `"${userFullName}" kullanıcısının Firestore belgesi silindi. (Auth silme işlemi için Admin SDK gereklidir ve ayrıca yapılmalıdır)` };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return { success: false, message: `"${userFullName}" kullanıcısı silinirken hata: ${error.message}. Auth silme Admin SDK gerektirebilir.` };
  }
}

    