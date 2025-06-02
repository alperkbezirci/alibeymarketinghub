
// src/app/(app)/user-management/actions.ts
"use server";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserDocumentInFirestore, deleteUserDocument, updateUserProfile } from "@/services/user-service";

interface AddUserResult {
  success: boolean;
  message: string;
  uid?: string;
}

export async function handleAddUserAction(prevState: any, formData: FormData): Promise<AddUserResult> {
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
    // Step 1: Create user in Firebase Authentication
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
  if (!uid) {
    return { success: false, message: "Kullanıcı ID'si silme işlemi için zorunludur." };
  }
  
  try {
    // Step 1: Delete Firestore document
    await deleteUserDocument(uid);

    // Step 2: Delete Firebase Authentication user
    // IMPORTANT TODO: THIS REQUIRES ADMIN SDK. The current user (admin) CANNOT delete another user via client SDK.
    console.warn(`TODO: Firebase Auth kullanıcısı (UID: ${uid}) silme işlemi Admin SDK gerektirir ve burada tam olarak uygulanamamıştır.`);
    
    return { success: true, message: `"${userFullName}" kullanıcısının Firestore belgesi silindi. (Auth silme işlemi Admin SDK gerektirir)` };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return { success: false, message: `"${userFullName}" kullanıcısı silinirken hata: ${error.message}. Auth silme Admin SDK gerektirebilir.` };
  }
}
