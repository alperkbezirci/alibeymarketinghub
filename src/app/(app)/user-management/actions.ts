
// src/app/(app)/user-management/actions.ts
"use server";

import { createUserWithEmailAndPassword, deleteUser as deleteAuthUserFirebase } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserDocumentInFirestore, deleteUserDocument, updateUserProfile } from "@/services/user-service";

// IMPORTANT: Firebase Admin SDK is REQUIRED to reliably delete other users' Auth accounts.
// Client-side SDK (firebase/auth) cannot delete another user's account.
// This is a simplified version for the prototype. In production, deleteAuthUser
// would call a Firebase Function or backend endpoint that uses the Admin SDK.

interface AddUserResult {
  success: boolean;
  message: string;
  uid?: string;
}

export async function handleAddUserAction(prevState: any, formData: FormData): Promise<AddUserResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const roles = formData.getAll("roles") as string[];

  if (!name || !email || !password || roles.length === 0) {
    return { success: false, message: "Lütfen tüm zorunlu alanları doldurun." };
  }

  try {
    // Step 1: Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const authUser = userCredential.user;

    if (!authUser || !authUser.uid) {
      throw new Error("Firebase Authentication kullanıcısı oluşturulamadı.");
    }

    // Step 2: Create user document in Firestore
    await createUserDocumentInFirestore(authUser.uid, email, name, roles);
    
    return { success: true, message: `"${name}" adlı kullanıcı başarıyla oluşturuldu.`, uid: authUser.uid };
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
  const name = formData.get("name") as string;
  const roles = formData.getAll("roles") as string[];

  if (!uid || !name || roles.length === 0) {
    return { success: false, message: "Kullanıcı ID, isim ve en az bir rol zorunludur." };
  }

  try {
    await updateUserProfile(uid, name, roles);
    return { success: true, message: `"${name}" adlı kullanıcının bilgileri güncellendi.` };
  } catch (error: any) {
    console.error("Error updating user:", error);
    return { success: false, message: error.message || "Kullanıcı güncellenirken bir hata oluştu." };
  }
}

interface DeleteUserResult {
  success: boolean;
  message: string;
}

export async function handleDeleteUserAction(uid: string, userName: string): Promise<DeleteUserResult> {
  if (!uid) {
    return { success: false, message: "Kullanıcı ID'si silme işlemi için zorunludur." };
  }
  
  try {
    // Step 1: Delete Firestore document
    await deleteUserDocument(uid);

    // Step 2: Delete Firebase Authentication user
    // IMPORTANT TODO: THIS REQUIRES ADMIN SDK. The current user (admin) CANNOT delete another user via client SDK.
    // This operation will likely fail or is not possible without a backend function (e.g., Firebase Function)
    // that uses the Firebase Admin SDK.
    // For prototype, we'll attempt it but expect issues or only Firestore deletion.
    // const userToDelete = auth.currentUser; // This is the *currently logged in* admin, not the user to delete.
    // Need to find a way to get the user object by UID to delete, or use Admin SDK.
    // This is a placeholder / known limitation for client-side only app.
    // await deleteAuthUserFirebase(userToDelete); // THIS IS WRONG - attempts to delete current admin

    console.warn(`TODO: Firebase Auth kullanıcısı (UID: ${uid}) silme işlemi Admin SDK gerektirir ve burada tam olarak uygulanamamıştır.`);
    
    return { success: true, message: `"${userName}" kullanıcısının Firestore belgesi silindi. (Auth silme işlemi Admin SDK gerektirir)` };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    // If Firestore deletion succeeded but Auth failed (or wasn't properly attempted), message should reflect that.
    return { success: false, message: `"${userName}" kullanıcısı silinirken hata: ${error.message}. Auth silme Admin SDK gerektirebilir.` };
  }
}
