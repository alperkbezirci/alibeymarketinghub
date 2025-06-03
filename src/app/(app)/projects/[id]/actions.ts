
// src/app/(app)/projects/[id]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus, type ProjectActivity, type ProjectActivityType } from '@/services/project-activity-service';
import { admin } from '@/lib/firebase-admin'; // Firebase Admin SDK'yı import et
import type { DecodedIdToken } from 'firebase-admin/auth';

interface AddActivityFormState {
  success: boolean;
  message: string;
  activityId?: string;
}

async function verifyIdToken(idToken: string): Promise<DecodedIdToken | null> {
  if (!admin.apps.length) {
    console.error("Firebase Admin SDK is not initialized. Cannot verify ID token.");
    return null;
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    console.error("Error verifying ID token:", error.message);
    if (error.code === 'auth/id-token-expired') {
      // Token süresi dolmuşsa, istemciye yeni bir token alması için bir yol sunulabilir.
      // Bu örnekte sadece null döndürüyoruz.
      console.warn("ID token has expired.");
    }
    return null;
  }
}


export async function handleAddProjectActivityAction(
  prevState: AddActivityFormState | undefined,
  formData: FormData
): Promise<AddActivityFormState> {
  console.log("[Action Log] handleAddProjectActivityAction - FormData received:", Object.fromEntries(formData));

  const projectId = formData.get('projectId') as string;
  const content = formData.get('content') as string;
  const fileInput = formData.get('file') as File | null;
  const idToken = formData.get('idToken') as string | null;

  if (!idToken) {
    return { success: false, message: "Kimlik doğrulama token'ı bulunamadı. Lütfen tekrar giriş yapmayı deneyin." };
  }

  const decodedToken = await verifyIdToken(idToken);

  if (!decodedToken) {
    return { success: false, message: "Kullanıcı kimliği doğrulanamadı. Oturumunuz zaman aşımına uğramış olabilir veya geçersiz bir token gönderdiniz." };
  }

  const serverVerifiedUserId = decodedToken.uid;
  // Firebase DecodedIdToken'da displayName olmayabilir, bu yüzden email veya uid'yi kullanabiliriz.
  // Gerçek bir uygulamada, kullanıcı profilinden isim çekmek daha iyi olabilir.
  const serverVerifiedUserName = decodedToken.name || decodedToken.email || serverVerifiedUserId;
  const serverVerifiedUserPhotoURL = decodedToken.picture || null;

  console.log(`[Action Log] Server-verified user: UID=${serverVerifiedUserId}, Name=${serverVerifiedUserName}`);


  if (!projectId || !serverVerifiedUserId) {
    console.error("[Action Log] Validation Error: Missing projectId or server-verified userId.");
    return { success: false, message: "Proje ID ve kullanıcı kimliği zorunludur." };
  }
  if (!content && (!fileInput || fileInput.size === 0)) {
    console.error("[Action Log] Validation Error: Content or file must be provided.");
    return { success: false, message: "Yorum veya dosya eklemelisiniz." };
  }

  let activityType: ProjectActivityType = 'comment';
  let fileName: string | undefined;
  let fileType: string | undefined;

  if (fileInput && fileInput.size > 0) {
    activityType = 'file_upload';
    fileName = fileInput.name;
    fileType = fileInput.type;
    // TODO: Gerçek dosya yükleme işlemi burada Firebase Storage'a yapılmalı.
    // Şimdilik sadece dosya adını ve türünü kaydediyoruz.
    console.log(`[Action Log] File detected: ${fileName}, Type: ${fileType}. Actual upload to Storage not implemented yet.`);
  }

  const initialStatus: ProjectActivityStatus = 'draft';

  const activityData: ProjectActivityInputData = {
    projectId,
    userId: serverVerifiedUserId,
    userName: serverVerifiedUserName,
    userPhotoURL: serverVerifiedUserPhotoURL || undefined,
    type: activityType,
    status: initialStatus,
    content: content || undefined,
    fileName,
    fileType,
  };
  console.log("[Action Log] handleAddProjectActivityAction - Activity data to be saved:", activityData);

  try {
    const newActivity = await addProjectActivity(activityData);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `${activityType === 'comment' ? 'Yorum taslağı' : 'Dosya taslağı'} başarıyla eklendi. Onaya gönderebilirsiniz.`, activityId: newActivity.id };
  } catch (error: any) {
    console.error("[Action Log] Error in handleAddProjectActivityAction when calling service:", error);
    console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return { success: false, message: `Aktivite eklenirken bir hata oluştu: ${error.message || "Bilinmeyen bir sunucu hatası oluştu."}` };
  }
}


interface UpdateActivityStatusFormState {
    success: boolean;
    message: string;
}

// TODO: Bu eylemler de ID Token ile korunmalı (işlemi yapan yöneticinin kimliği doğrulanmalı)
// Şimdilik, sadece `handleAddProjectActivityAction` için ID token doğrulamasını ekledik.
// Diğer eylemler için benzer bir mantık uygulanmalıdır.

export async function handleUpdateActivityStatusAction(
    activityId: string,
    projectId: string,
    newStatus: ProjectActivityStatus,
    messageForManager?: string
): Promise<UpdateActivityStatusFormState> {
    // YER TUTUCU: Gerçek admin/yetki kontrolü burada olmalı (ID Token ile)
    // Örneğin:
    // const adminIdToken = formData.get('adminIdToken') as string;
    // const decodedAdminToken = await verifyIdToken(adminIdToken);
    // if (!decodedAdminToken || !isUserAdmin(decodedAdminToken.uid)) {
    //   return { success: false, message: "Bu işlemi yapma yetkiniz yok." };
    // }

    if (!activityId || !newStatus) {
        return { success: false, message: "Aktivite ID ve yeni durum zorunludur." };
    }
    console.log(`[Action Log] handleUpdateActivityStatusAction - Updating activity ${activityId} to status ${newStatus} with message: "${messageForManager}"`);
    try {
        const updates: Partial<ProjectActivity> = { status: newStatus };
        
        if (messageForManager && messageForManager.trim() !== "") {
            updates.messageForManager = messageForManager.trim();
        } else {
            updates.messageForManager = null as any; 
        }
        
        await updateProjectActivity(activityId, updates);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Aktivite durumu başarıyla güncellendi." };
    } catch (error: any) {
        console.error("[Action Log] Error in handleUpdateActivityStatusAction:", error);
        console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return { success: false, message: `Aktivite durumu güncellenirken bir hata oluştu: ${error.message || "Bilinmeyen bir sunucu hatası oluştu."}` };
    }
}

export async function handleApproveActivityAction(
    activityId: string,
    projectId: string,
    managerFeedback?: string
): Promise<UpdateActivityStatusFormState> {
    // YER TUTUCU: Gerçek admin/yetki kontrolü burada olmalı (ID Token ile)
    if (!activityId || !projectId) {
        return { success: false, message: "Aktivite ID ve Proje ID zorunludur." };
    }
    try {
        const updates: Partial<ProjectActivity> = { 
            status: 'approved',
            managerFeedback: managerFeedback && managerFeedback.trim() !== "" ? managerFeedback.trim() : null
        };
        await updateProjectActivity(activityId, updates);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Aktivite başarıyla onaylandı." };
    } catch (error: any) {
        console.error("[Action Log] Error in handleApproveActivityAction:", error);
        return { success: false, message: `Aktivite onaylanırken bir hata oluştu: ${error.message || "Bilinmeyen bir sunucu hatası oluştu."}` };
    }
}

export async function handleRejectActivityAction(
    activityId: string,
    projectId: string,
    managerFeedback?: string
): Promise<UpdateActivityStatusFormState> {
    // YER TUTUCU: Gerçek admin/yetki kontrolü burada olmalı (ID Token ile)
    if (!activityId || !projectId) {
        return { success: false, message: "Aktivite ID ve Proje ID zorunludur." };
    }
    try {
        const updates: Partial<ProjectActivity> = { 
            status: 'rejected',
            managerFeedback: managerFeedback && managerFeedback.trim() !== "" ? managerFeedback.trim() : null
        };
        await updateProjectActivity(activityId, updates);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Aktivite reddedildi." };
    } catch (error: any) {
        console.error("[Action Log] Error in handleRejectActivityAction:", error);
        return { success: false, message: `Aktivite reddedilirken bir hata oluştu: ${error.message || "Bilinmeyen bir sunucu hatası oluştu."}` };
    }
}
