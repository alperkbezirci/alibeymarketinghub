
// src/app/(app)/projects/[id]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus, type ProjectActivity, type ProjectActivityType } from '@/services/project-activity-service';
// import { getAuth } from "firebase-admin/auth"; // Gerçek sunucu tarafı kimlik doğrulama için örnek
// import { auth as adminAuth } from '@/lib/firebase-admin'; // Firebase Admin SDK'nız varsa

interface AddActivityFormState {
  success: boolean;
  message: string;
  activityId?: string;
}

export async function handleAddProjectActivityAction(
  prevState: AddActivityFormState | undefined,
  formData: FormData
): Promise<AddActivityFormState> {
  console.log("[Action Log] handleAddProjectActivityAction - FormData received:", Object.fromEntries(formData));

  const projectId = formData.get('projectId') as string;
  const content = formData.get('content') as string;
  const fileInput = formData.get('file') as File | null;

  // ÖNEMLİ GÜVENLİK NOTU:
  // Aşağıdaki kullanıcı bilgileri (userId, userName, userPhotoURL) istemciden geliyor.
  // Güvenli bir uygulamada, bu bilgiler ASLA doğrudan istemciden alınmamalıdır.
  // Bunun yerine, sunucu tarafında aktif oturumdan (örneğin bir çerez veya token aracılığıyla)
  // kimliği doğrulanmış kullanıcının bilgileri güvenli bir şekilde alınmalıdır.
  // Örnek: const session = await getServerSession(authOptions); const serverUserId = session.user.id;
  // Veya Firebase Admin SDK kullanarak:
  // const idToken = req.headers.authorization?.split('Bearer ')[1];
  // const decodedToken = await adminAuth.verifyIdToken(idToken);
  // const serverUserId = decodedToken.uid;

  // Şimdilik, istemciden gelen bilgileri kullanıyoruz AMA BU GÜVENLİ DEĞİLDİR ve değiştirilmelidir.
  // Bu bir YER TUTUCUDUR ve gerçek bir sunucu tarafı kimlik doğrulama mekanizması ile değiştirilmelidir.
  const clientSentUserId = formData.get('userId') as string;
  const clientSentUserName = formData.get('userName') as string;
  const clientSentUserPhotoURL = formData.get('userPhotoURL') as string | null;

  // Güvenlik için simüle edilmiş sunucu tarafı kullanıcı bilgisi (YER TUTUCU)
  // GERÇEK UYGULAMADA BURASI GERÇEK SUNUCU TARAFI KİMLİK DOĞRULAMA İLE DEĞİŞTİRİLMELİDİR.
  const serverVerifiedUser = {
    uid: clientSentUserId, // GEÇİCİ - GERÇEK SUNUCU DOĞRULAMASI İLE DEĞİŞTİRİN
    name: clientSentUserName, // GEÇİCİ - GERÇEK SUNUCU DOĞRULAMASI İLE DEĞİŞTİRİN
    photoURL: clientSentUserPhotoURL, // GEÇİCİ - GERÇEK SUNUCU DOĞRULAMASI İLE DEĞİŞTİRİN
  };

  console.warn(`[SECURITY_RISK] Using client-sent user ID (${serverVerifiedUser.uid}) and name (${serverVerifiedUser.name}) in handleAddProjectActivityAction. This MUST be replaced with server-side session/token verification.`);


  if (!projectId || !serverVerifiedUser.uid || !serverVerifiedUser.name) {
    console.error("[Action Log] Validation Error: Missing projectId, or server-verified userId/userName.");
    return { success: false, message: "Proje ID, kullanıcı ID ve kullanıcı adı zorunludur." };
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
    console.log(`[Action Log] File detected: ${fileName}, Type: ${fileType}. Actual upload to Storage not implemented yet.`);
  }

  const initialStatus: ProjectActivityStatus = 'draft';

  const activityData: ProjectActivityInputData = {
    projectId,
    userId: serverVerifiedUser.uid, // Sunucuda doğrulanmış kullanıcı ID'si kullanılmalı
    userName: serverVerifiedUser.name, // Sunucuda doğrulanmış kullanıcı adı kullanılmalı
    userPhotoURL: serverVerifiedUser.photoURL || undefined, // Sunucuda doğrulanmış fotoğraf URL'si
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

export async function handleUpdateActivityStatusAction(
    activityId: string,
    projectId: string,
    newStatus: ProjectActivityStatus,
    messageForManager?: string
): Promise<UpdateActivityStatusFormState> {
    // GÜVENLİK NOTU: Bu işlemi kimin yapabileceği kontrol edilmeli.
    // Örneğin, sadece aktivite sahibi taslağını onaya gönderebilmeli.
    // const { userId: currentUserId, roles: currentUserRoles } = await getAuthenticatedUserOnServer(); // Örnek
    // const activity = await getActivityById(activityId);
    // if (activity.userId !== currentUserId && newStatus === 'pending_approval') {
    //   return { success: false, message: "Bu aktiviteyi onaya gönderme yetkiniz yok." };
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
    // GÜVENLİK NOTU: Bu işlemi sadece Admin veya Pazarlama Müdürü yapabilmeli.
    // const { roles: currentUserRoles } = await getAuthenticatedUserOnServer(); // Örnek
    // if (!currentUserRoles.includes('Admin') && !currentUserRoles.includes('Pazarlama Müdürü')) {
    //    return { success: false, message: "Bu aktiviteyi onaylama yetkiniz yok." };
    // }

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
    // GÜVENLİK NOTU: Bu işlemi sadece Admin veya Pazarlama Müdürü yapabilmeli.
    // const { roles: currentUserRoles } = await getAuthenticatedUserOnServer(); // Örnek
    // if (!currentUserRoles.includes('Admin') && !currentUserRoles.includes('Pazarlama Müdürü')) {
    //    return { success: false, message: "Bu aktiviteyi reddetme yetkiniz yok." };
    // }

    if (!activityId || !projectId) {
        return { success: false, message: "Aktivite ID ve Proje ID zorunludur." };
    }
    // Reddetme işlemi için geri bildirim zorunlu tutulabilir:
    // if (!managerFeedback || managerFeedback.trim() === "") {
    //     return { success: false, message: "Reddetme işlemi için geri bildirim zorunludur." };
    // }
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

    