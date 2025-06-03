
// src/app/(app)/projects/[id]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { admin } from '@/lib/firebase-admin';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus, type ProjectActivity, type ProjectActivityType } from '@/services/project-activity-service';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"; // Client SDK storage
import { db } from '@/lib/firebase'; // Client SDK Firestore for activity update
import { USER_ROLES } from '@/lib/constants';
import { getUserRoles } from '@/services/user-service';
import { getProjectById } from '@/services/project-service';


const STORAGE_BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'alibey-marketing-hub.appspot.com';

interface AddActivityFormState {
  success: boolean;
  message: string;
  activityId?: string;
}

async function verifyIdTokenAndGetUserDetails(idToken: string): Promise<{ uid: string; name: string; photoURL?: string } | null> {
  if (!admin.apps.length) {
    console.error("Firebase Admin SDK is not initialized. Cannot verify ID token.");
    return null;
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      name: decodedToken.name || decodedToken.email || decodedToken.uid,
      photoURL: decodedToken.picture || undefined,
    };
  } catch (error: any) {
    console.error("Error verifying ID token or getting user details:", error.message);
    if (error.code === 'auth/id-token-expired') {
      console.warn("ID token has expired.");
    }
    return null;
  }
}


async function checkManagerOrAdminPrivileges(idToken?: string | null): Promise<boolean> {
    if (!idToken) {
        console.warn("[Project Action - checkManagerOrAdminPrivileges] No ID token provided.");
        return false;
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const roles = await getUserRoles(decodedToken.uid);

        if (roles && (roles.includes(USER_ROLES.ADMIN) || roles.includes(USER_ROLES.MARKETING_MANAGER))) {
            return true;
        }
        console.warn(`[Project Action - checkManagerOrAdminPrivileges] User ${decodedToken.uid} is not Admin or Marketing Manager. Roles: ${roles}`);
        return false;
    } catch (error: any) {
        console.error("[Project Action - checkManagerOrAdminPrivileges] Error verifying ID token or fetching roles:", error.message);
        return false;
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

  const userDetails = await verifyIdTokenAndGetUserDetails(idToken);

  if (!userDetails) {
    return { success: false, message: "Kullanıcı kimliği doğrulanamadı. Oturumunuz zaman aşımına uğramış olabilir veya geçersiz bir token gönderdiniz." };
  }

  const { uid: serverVerifiedUserId, name: serverVerifiedUserName, photoURL: serverVerifiedUserPhotoURL } = userDetails;
  console.log(`[Action Log] Server-verified user: UID=${serverVerifiedUserId}, Name=${serverVerifiedUserName}`);

  if (!projectId) {
    console.error("[Action Log] Validation Error: Missing projectId.");
    return { success: false, message: "Proje ID zorunludur." };
  }
  if (!content && (!fileInput || fileInput.size === 0)) {
    console.error("[Action Log] Validation Error: Content or file must be provided.");
    return { success: false, message: "Yorum veya dosya eklemelisiniz." };
  }

  let activityType: ProjectActivityType = 'comment';
  let fileName: string | undefined;
  let fileType: string | undefined;
  let storagePath: string | undefined;
  let fileURL: string | undefined;

  // Get project's hotel information
  let projectHotel: string | undefined;
  try {
    const projectDetails = await getProjectById(projectId);
    if (projectDetails) {
      projectHotel = projectDetails.hotel;
    } else {
      console.warn(`[Action Log] Project with ID ${projectId} not found when trying to get hotel info for activity.`);
    }
  } catch (projectError: any) {
    console.error(`[Action Log] Error fetching project details for hotel info: ${projectError.message}`);
    // Continue without hotel info if project fetch fails, or decide to fail the action
  }


  const initialActivityData: ProjectActivityInputData = {
    projectId,
    userId: serverVerifiedUserId,
    userName: serverVerifiedUserName,
    userPhotoURL: serverVerifiedUserPhotoURL,
    type: fileInput && fileInput.size > 0 ? 'file_upload' : 'comment',
    status: 'draft', 
    content: content || undefined,
    fileName: fileInput && fileInput.size > 0 ? fileInput.name : undefined,
    fileType: fileInput && fileInput.size > 0 ? fileInput.type : undefined,
    hotel: projectHotel, // Add hotel info here
  };

  let newActivityId: string;
  try {
    const preliminaryActivity = await addProjectActivity(initialActivityData);
    newActivityId = preliminaryActivity.id;
    console.log(`[Action Log] Preliminary activity document created with ID: ${newActivityId}`);
  } catch (error: any) {
    console.error("[Action Log] Error creating preliminary activity document:", error);
    return { success: false, message: `Aktivite ön kaydı oluşturulurken bir hata oluştu: ${error.message}` };
  }

  if (fileInput && fileInput.size > 0) {
    activityType = 'file_upload';
    fileName = fileInput.name;
    fileType = fileInput.type;
    
    storagePath = `project-activities/${projectId}/${newActivityId}/${fileName}`;
    console.log(`[Action Log] Attempting to upload file to Storage: ${storagePath}`);

    try {
      if (!admin.apps.length) {
          throw new Error("Firebase Admin SDK is not initialized. Cannot upload file.");
      }
      const bucket = admin.storage().bucket(STORAGE_BUCKET_NAME);
      const fileBuffer = Buffer.from(await fileInput.arrayBuffer());
      const storageFile = bucket.file(storagePath);
      
      await storageFile.save(fileBuffer, {
          metadata: { contentType: fileType },
      });
      
      await storageFile.makePublic();
      fileURL = storageFile.publicUrl();

      console.log(`[Action Log] File uploaded successfully. URL: ${fileURL}`);

      await updateProjectActivity(newActivityId, { fileURL, storagePath, type: 'file_upload' }); 
      console.log(`[Action Log] Activity document ${newActivityId} updated with file details.`);

    } catch (uploadError: any) {
      console.error("[Action Log] Error uploading file to Firebase Storage or updating Firestore:", uploadError);
      try {
        console.warn(`[Action Log] Cleanup: Could not delete preliminary activity ${newActivityId} after failed upload. Manual check might be needed.`);
      } catch (cleanupError) {
        console.error(`[Action Log] Error cleaning up preliminary activity ${newActivityId}:`, cleanupError);
      }
      return { success: false, message: `Dosya yüklenirken veya aktivite güncellenirken hata: ${uploadError.message}` };
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return { 
    success: true, 
    message: `${activityType === 'comment' ? 'Yorum taslağı' : 'Dosya taslağı'} başarıyla eklendi. Onaya gönderebilirsiniz.`, 
    activityId: newActivityId 
  };
}


interface UpdateActivityStatusFormState {
    success: boolean;
    message: string;
}

export async function handleUpdateActivityStatusAction(
    activityId: string,
    projectId: string,
    newStatus: ProjectActivityStatus,
    messageForManager?: string,
    idToken?: string | null 
): Promise<UpdateActivityStatusFormState> {
    
    let authorized = false;
    const userDetails = idToken ? await verifyIdTokenAndGetUserDetails(idToken) : null;
    
    if (!userDetails) {
        return { success: false, message: "Bu işlemi yapmak için kimliğiniz doğrulanamadı." };
    }

    // Fetch the activity to check its current owner if needed
    // For simplicity, this part is omitted but in a real scenario,
    // you'd fetch the activity here to ensure `userDetails.uid` matches `activity.userId` for 'pending_approval'
    // For now, we trust if token is valid, user is authorized to send their own draft for approval.

    if (newStatus === 'pending_approval') {
        // Any authenticated user (who is the author, ideally checked by fetching activity) can send for approval
        authorized = true; 
    } else {
        console.warn("handleUpdateActivityStatusAction called for non-draft status update. This should go via approve/reject actions.");
        return { success: false, message: "Onay/Red işlemleri için lütfen ilgili butonları kullanın." };
    }

    if (!authorized) {
        return { success: false, message: "Bu işlemi yapma yetkiniz bulunmamaktadır." };
    }


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
    managerFeedback?: string,
    idToken?: string | null 
): Promise<UpdateActivityStatusFormState> {
    const isManager = await checkManagerOrAdminPrivileges(idToken);
    if (!isManager) {
      return { success: false, message: "Bu işlemi yapma yetkiniz yok." };
    }

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
    managerFeedback?: string,
    idToken?: string | null 
): Promise<UpdateActivityStatusFormState> {
    const isManager = await checkManagerOrAdminPrivileges(idToken);
    if (!isManager) {
      return { success: false, message: "Bu işlemi yapma yetkiniz yok." };
    }

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
