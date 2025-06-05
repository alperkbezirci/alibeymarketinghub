
// src/app/(app)/projects/[id]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { admin, adminInitialized, adminInitializationError } from '@/lib/firebase-admin';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus, type ProjectActivity, type ProjectActivityType } from '@/services/project-activity-service';
import type { DecodedIdToken } from 'firebase-admin/auth';
// getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject are for Client SDK, not Admin SDK file uploads.
// For Admin SDK, we use admin.storage().bucket().file().save() etc.
// import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db } from '@/lib/firebase'; // Client SDK Firestore for activity update - this might be an issue if we intend to use Admin SDK for all server ops. For now, assuming services use appropriate SDKs.
import { USER_ROLES } from '@/lib/constants';
import { getUserRoles } from '@/services/user-service';
import { getProjectById, updateProject, type ProjectEditFormData, type Project as ProjectType } from '@/services/project-service'; // Renamed Project to ProjectType to avoid conflict


const STORAGE_BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

interface AddActivityFormState {
  success: boolean;
  message: string;
  activityId?: string;
}

async function verifyIdTokenAndGetUserDetails(idToken: string): Promise<{ uid: string; name:string; photoURL?: string } | null> {
  console.log(`[Action Log - verifyIdTokenAndGetUserDetails] Invoked. Firebase Admin SDK is initialized: ${adminInitialized}`);
  if (!adminInitialized) {
    console.error("[Action Log - verifyIdTokenAndGetUserDetails] CRITICAL: Firebase Admin SDK is not initialized. Cannot verify ID token. Initialization error:", adminInitializationError);
    return null;
  }
  if (!idToken || idToken.trim() === "") {
    console.error("[Action Log - verifyIdTokenAndGetUserDetails] Received idToken is null or empty.");
    return null;
  }
  console.log(`[Action Log - verifyIdTokenAndGetUserDetails] Received idToken length: ${idToken.length}. Attempting verification...`);
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(`[Action Log - verifyIdTokenAndGetUserDetails] Successfully verified ID token for UID: ${decodedToken.uid}`);
    return {
      uid: decodedToken.uid,
      name: decodedToken.name || decodedToken.email || decodedToken.uid, // Ensure name is populated
      photoURL: decodedToken.picture || undefined,
    };
  } catch (error: any) {
    console.error(`[Action Log - verifyIdTokenAndGetUserDetails] Error verifying ID token. Code: ${error.code}, Message: ${error.message}`, error);
    if (error.code === 'auth/id-token-expired') {
      console.warn("[Action Log - verifyIdTokenAndGetUserDetails] ID token has expired.");
    }
    return null;
  }
}


async function checkManagerOrAdminPrivileges(idToken?: string | null): Promise<boolean> {
    console.log(`[Action Log - checkManagerOrAdminPrivileges] Invoked. Firebase Admin SDK is initialized: ${adminInitialized}. ID token present: ${!!idToken}`);
    if (!adminInitialized) {
        console.error("[Action Log - checkManagerOrAdminPrivileges] CRITICAL: Firebase Admin SDK is not initialized. Admin check failed. Initialization error:", adminInitializationError);
        return false;
    }
    if (!idToken) {
        console.warn("[Action Log - checkManagerOrAdminPrivileges] No ID token provided. Access denied.");
        return false;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const roles = await getUserRoles(decodedToken.uid); // Assumes getUserRoles is robust
        console.log(`[Action Log - checkManagerOrAdminPrivileges] User UID: ${decodedToken.uid}, Roles: ${JSON.stringify(roles)}`);

        if (roles && (roles.includes(USER_ROLES.ADMIN) || roles.includes(USER_ROLES.MARKETING_MANAGER))) {
            console.log(`[Action Log - checkManagerOrAdminPrivileges] User ${decodedToken.uid} IS Admin or Marketing Manager. Access GRANTED.`);
            return true;
        }
        console.warn(`[Action Log - checkManagerOrAdminPrivileges] User ${decodedToken.uid} is NOT Admin or Marketing Manager. Roles: ${JSON.stringify(roles)}. Access DENIED.`);
        return false;
    } catch (error: any) {
        console.error(`[Action Log - checkManagerOrAdminPrivileges] Error verifying ID token or fetching roles. Code: ${error.code}, Message: ${error.message}`, error);
        return false;
    }
}


export async function handleAddProjectActivityAction(
  prevState: AddActivityFormState | undefined,
  formData: FormData
): Promise<AddActivityFormState> {
  console.log("[Action Log - handleAddProjectActivityAction] Action invoked.");

  if (!adminInitialized) {
    const errorMessage = `Sunucu yapılandırma hatası: Firebase Admin SDK başlatılamadı. Lütfen sunucu loglarını kontrol edin. Detay: ${adminInitializationError || "Bilinmeyen Admin SDK başlatma hatası."}`;
    console.error(`[Action Log - handleAddProjectActivityAction] CRITICAL: Firebase Admin SDK not initialized. Error: ${adminInitializationError}`);
    return { success: false, message: errorMessage };
  }

  if (!STORAGE_BUCKET_NAME) {
    console.error("[Action Log - handleAddProjectActivityAction] CRITICAL: Firebase Storage bucket name (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) is not configured in environment variables.");
    return { success: false, message: "Sunucu yapılandırma hatası: Depolama alanı adı tanımlanmamış. Lütfen NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ortam değişkenini kontrol edin." };
  }
  
  try {
    console.log("[Action Log - handleAddProjectActivityAction] Action started. Admin SDK initialized. Storage bucket name configured.");
    const projectId = formData.get('projectId') as string;
    const content = formData.get('content') as string;
    const fileInput = formData.get('file') as File | null;
    const idToken = formData.get('idToken') as string | null;

    if (!projectId || typeof projectId !== 'string' || projectId.trim() === "") {
      console.error("[Action Log - handleAddProjectActivityAction] Invalid or missing projectId in formData.");
      return { success: false, message: "Proje ID'si form verilerinde eksik veya geçersiz." };
    }

    const idTokenLength = idToken ? idToken.length : 'N/A';
    console.log(`[Action Log - handleAddProjectActivityAction] Extracted form data. Project ID: ${projectId}, Content present: ${!!content}, File name: ${fileInput?.name || 'Yok'}, File size: ${fileInput?.size || 'N/A'}, ID Token length: ${idTokenLength}`);

    if (!idToken) {
      console.error("[Action Log - handleAddProjectActivityAction] ID Token is missing from form data.");
      return { success: false, message: "Kimlik doğrulama token'ı bulunamadı. Lütfen tekrar giriş yapmayı deneyin." };
    }

    const userDetails = await verifyIdTokenAndGetUserDetails(idToken);

    if (!userDetails) {
      console.error("[Action Log - handleAddProjectActivityAction] User details could not be verified from ID Token. Token might be invalid or expired, or Admin SDK issue persists.");
      return { success: false, message: "Kullanıcı kimliği doğrulanamadı. Oturumunuz zaman aşımına uğramış olabilir, geçersiz bir token gönderdiniz veya sunucu tarafında bir sorun var. Lütfen sunucu loglarını kontrol edin." };
    }

    const { uid: serverVerifiedUserId, name: serverVerifiedUserName, photoURL: serverVerifiedUserPhotoURL } = userDetails;
    console.log(`[Action Log - handleAddProjectActivityAction] Server-verified user: UID=${serverVerifiedUserId}, Name=${serverVerifiedUserName}`);

    if (!content && (!fileInput || fileInput.size === 0)) {
      console.error("[Action Log - handleAddProjectActivityAction] Validation Error: Content or file must be provided.");
      return { success: false, message: "Yorum veya dosya eklemelisiniz." };
    }

    let projectHotel: string | undefined;
    try {
      console.log(`[Action Log - handleAddProjectActivityAction] Fetching project details for ID: ${projectId} to get hotel info.`);
      const projectDetails = await getProjectById(projectId); // Assumes getProjectById is robust
      if (projectDetails) {
        projectHotel = projectDetails.hotel;
        console.log(`[Action Log - handleAddProjectActivityAction] Fetched hotel '${projectHotel || 'N/A'}' for project '${projectId}'`);
      } else {
        console.warn(`[Action Log - handleAddProjectActivityAction] Project with ID ${projectId} not found when trying to get hotel info for activity.`);
      }
    } catch (projectError: any) {
      console.error(`[Action Log - handleAddProjectActivityAction] Error fetching project details for hotel info: ${projectError.message}`, projectError);
      // Decide if this is a critical error. For now, we'll proceed without hotel info if it fails.
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
      // hotel: projectHotel, // Include hotel if fetched // Removed as activity does not store hotel
    };
    console.log("[Action Log - handleAddProjectActivityAction] Prepared initial activity data:", JSON.stringify(initialActivityData, null, 2));

    let newActivityId: string;
    try {
      console.log("[Action Log - handleAddProjectActivityAction] Attempting to create preliminary activity document in Firestore...");
      const preliminaryActivity = await addProjectActivity(initialActivityData); // Assumes addProjectActivity is robust
      newActivityId = preliminaryActivity.id;
      console.log(`[Action Log - handleAddProjectActivityAction] Preliminary activity document created with ID: ${newActivityId}`);
    } catch (error: any) {
      console.error("[Action Log - handleAddProjectActivityAction] Error creating preliminary activity document in Firestore (via service):", error.message, error);
      return { success: false, message: `Aktivite ön kaydı Firestore'a yazılırken bir hata oluştu: ${error.message}` };
    }

    let finalActivityType = initialActivityData.type; 
    let fileURL: string | undefined;
    let storagePath: string | undefined;

    if (fileInput && fileInput.size > 0) {
      finalActivityType = 'file_upload'; 
      const uniqueFileName = `${newActivityId}-${fileInput.name.replace(/\s+/g, '_')}`; // Ensure unique name using activity ID
      storagePath = `project-activities/${projectId}/${uniqueFileName}`;
      console.log(`[Action Log - handleAddProjectActivityAction] File detected. Storage path will be: ${storagePath}`);

      try {
        console.log(`[Action Log - handleAddProjectActivityAction] Attempting to read file into buffer. File name: ${fileInput.name}, size: ${fileInput.size}, type: ${fileInput.type}`);
        const fileBuffer = Buffer.from(await fileInput.arrayBuffer());
        console.log(`[Action Log - handleAddProjectActivityAction] File buffer created. Length: ${fileBuffer.length}`);
        
        console.log(`[Action Log - handleAddProjectActivityAction] Accessing Firebase Admin Storage bucket: ${STORAGE_BUCKET_NAME}`);
        const bucket = admin.storage().bucket(STORAGE_BUCKET_NAME);
        console.log(`[Action Log - handleAddProjectActivityAction] Storage bucket obtained. Attempting to get file reference for: ${storagePath}`);
        const storageFile = bucket.file(storagePath);
        
        console.log(`[Action Log - handleAddProjectActivityAction] Attempting to save file to Storage...`);
        await storageFile.save(fileBuffer, {
            metadata: { contentType: fileInput.type || 'application/octet-stream' }, // Provide default content type
        });
        console.log(`[Action Log - handleAddProjectActivityAction] File saved to Storage. Attempting to make public...`);
        
        await storageFile.makePublic(); // This makes the file publicly readable via its direct GCS URL
        console.log(`[Action Log - handleAddProjectActivityAction] File made public. Attempting to get public URL...`);
        fileURL = storageFile.publicUrl(); // This is the public URL
        console.log(`[Action Log - handleAddProjectActivityAction] File uploaded successfully. URL: ${fileURL}`);

        console.log(`[Action Log - handleAddProjectActivityAction] Attempting to update activity document ${newActivityId} with file details...`);
        await updateProjectActivity(newActivityId, { fileURL, storagePath, type: 'file_upload' }); // Assumes updateProjectActivity is robust
        console.log(`[Action Log - handleAddProjectActivityAction] Activity document ${newActivityId} updated with file details.`);

      } catch (uploadError: any) {
        console.error("[Action Log - handleAddProjectActivityAction] Error during file upload or Firestore update for file details:", uploadError.message, uploadError.code ? `(Code: ${uploadError.code})` : '', uploadError);
        // Attempt to delete preliminary activity if file upload fails
        try {
            // await deleteDoc(doc(db, PROJECT_ACTIVITIES_COLLECTION, newActivityId)); // Need Firestore Admin for this or a service
            console.warn(`[Action Log - handleAddProjectActivityAction] File upload failed. Preliminary activity ${newActivityId} was not automatically cleaned up. Manual cleanup might be needed.`);
        } catch (cleanupError: any) {
            console.error(`[Action Log - handleAddProjectActivityAction] Error cleaning up preliminary activity ${newActivityId} after file upload failure:`, cleanupError);
        }
        return { success: false, message: `Dosya yüklenirken veya aktivite güncellenirken hata: ${uploadError.message}. Lütfen sunucu loglarını kontrol edin.` };
      }
    }

    console.log(`[Action Log - handleAddProjectActivityAction] Attempting to revalidate path: /projects/${projectId}`);
    revalidatePath(`/projects/${projectId}`);
    console.log(`[Action Log - handleAddProjectActivityAction] Successfully added activity. Type: ${finalActivityType}. Revalidated path /projects/${projectId}`);
    return { 
      success: true, 
      message: `${finalActivityType === 'comment' ? 'Yorum taslağı' : 'Dosya taslağı'} başarıyla eklendi. Onaya gönderebilirsiniz.`, 
      activityId: newActivityId 
    };

  } catch (e: any) {
    console.error("[Action Log - handleAddProjectActivityAction] CRITICAL UNHANDLED EXCEPTION in action. Full error object:", e);
    let specificMessage = "Bilinmeyen bir sunucu hatası oluştu.";
    if (e && typeof e.message === 'string') {
      specificMessage = e.message;
    } else if (typeof e === 'string') {
      specificMessage = e;
    } else if (e && typeof e.toString === 'function') {
      specificMessage = e.toString();
    }
    console.error("[Action Log - handleAddProjectActivityAction] Determined specific error message for client:", specificMessage);
    return { 
      success: false, 
      message: `Sunucu tarafında beklenmedik bir hata oluştu. Lütfen sistem yöneticisine başvurun. Detay: ${specificMessage}` 
    };
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
    messageForManager?: string,
    idToken?: string | null 
): Promise<UpdateActivityStatusFormState> {
  console.log(`[Action Log - handleUpdateActivityStatusAction] Action invoked for activity ${activityId}, new status ${newStatus}. Admin SDK Initialized: ${adminInitialized}`);
  if (!adminInitialized) {
    const errorMessage = `Sunucu yapılandırma hatası: Firebase Admin SDK başlatılamadı. Detay: ${adminInitializationError || "Bilinmeyen Admin SDK başlatma hatası."}`;
    console.error(`[Action Log - handleUpdateActivityStatusAction] CRITICAL: Firebase Admin SDK not initialized. Error: ${adminInitializationError}`);
    return { success: false, message: errorMessage };
  }
  try {
    if (!idToken) {
      console.error("[Action Log - handleUpdateActivityStatusAction] ID Token is missing.");
      return { success: false, message: "Kimlik doğrulama token'ı eksik." };
    }
    const userDetails = await verifyIdTokenAndGetUserDetails(idToken);
    if (!userDetails) {
      console.error("[Action Log - handleUpdateActivityStatusAction] User details could not be verified.");
      return { success: false, message: "Bu işlemi yapmak için kimliğiniz doğrulanamadı. Lütfen sunucu loglarını kontrol edin." };
    }
    
    if (newStatus !== 'pending_approval') {
        console.warn("[Action Log - handleUpdateActivityStatusAction] This action is currently only intended for 'pending_approval'. User is attempting to set status to:", newStatus);
        // Depending on requirements, you might want to allow other status updates by the author,
        // or restrict this action strictly to 'pending_approval'.
        // For now, we'll allow it but log a warning.
    }

    if (!activityId || !newStatus) {
        console.error("[Action Log - handleUpdateActivityStatusAction] Activity ID or new status is missing.");
        return { success: false, message: "Aktivite ID ve yeni durum zorunludur." };
    }
     if (!projectId || typeof projectId !== 'string' || projectId.trim() === "") {
      console.error("[Action Log - handleUpdateActivityStatusAction] Invalid or missing projectId.");
      return { success: false, message: "Proje ID'si eksik veya geçersiz." };
    }
    
    const updates: Partial<ProjectActivity> = { status: newStatus };
    
    if (messageForManager && messageForManager.trim() !== "") {
        updates.messageForManager = messageForManager.trim();
    } else {
        updates.messageForManager = null as any; // Or FieldValue.delete() if you want to remove it
    }
    
    await updateProjectActivity(activityId, updates); // Assumes updateProjectActivity is robust
    revalidatePath(`/projects/${projectId}`);
    console.log(`[Action Log - handleUpdateActivityStatusAction] Successfully updated activity ${activityId} to status ${newStatus}.`);
    return { success: true, message: `Aktivite durumu başarıyla '${newStatus}' olarak güncellendi.` };

  } catch (error: any) {
    console.error(`[Action Log - handleUpdateActivityStatusAction] Error updating activity ${activityId}:`, error);
    let specificMessage = "Bilinmeyen bir sunucu hatası oluştu.";
    if (error && typeof error.message === 'string') {
      specificMessage = error.message;
    } else if (typeof error === 'string') {
      specificMessage = error;
    } else if (error && typeof error.toString === 'function') {
      specificMessage = error.toString();
    }
    return { success: false, message: `Aktivite durumu güncellenirken bir hata oluştu: ${specificMessage}` };
  }
}

export async function handleApproveActivityAction(
    activityId: string,
    projectId: string,
    managerFeedback?: string,
    idToken?: string | null 
): Promise<UpdateActivityStatusFormState> {
  console.log(`[Action Log - handleApproveActivityAction] Action invoked for activity ${activityId}. Admin SDK Initialized: ${adminInitialized}`);
  if (!adminInitialized) {
    const errorMessage = `Sunucu yapılandırma hatası: Firebase Admin SDK başlatılamadı. Detay: ${adminInitializationError || "Bilinmeyen Admin SDK başlatma hatası."}`;
    console.error(`[Action Log - handleApproveActivityAction] CRITICAL: Firebase Admin SDK not initialized. Error: ${adminInitializationError}`);
    return { success: false, message: errorMessage };
  }
  try {
    const isManager = await checkManagerOrAdminPrivileges(idToken); // Assumes robust
    if (!isManager) {
      console.warn("[Action Log - handleApproveActivityAction] Unauthorized attempt to approve activity.");
      return { success: false, message: "Bu işlemi yapma yetkiniz yok." };
    }

    if (!activityId || !projectId) {
        console.error("[Action Log - handleApproveActivityAction] Activity ID or Project ID is missing.");
        return { success: false, message: "Aktivite ID ve Proje ID zorunludur." };
    }
    if (typeof projectId !== 'string' || projectId.trim() === "") {
      console.error("[Action Log - handleApproveActivityAction] Invalid or missing projectId.");
      return { success: false, message: "Proje ID'si eksik veya geçersiz." };
    }
    const updates: Partial<ProjectActivity> = { 
        status: 'approved',
        managerFeedback: managerFeedback && managerFeedback.trim() !== "" ? managerFeedback.trim() : null
    };
    await updateProjectActivity(activityId, updates); // Assumes robust
    revalidatePath(`/projects/${projectId}`);
    console.log(`[Action Log - handleApproveActivityAction] Successfully approved activity ${activityId}.`);
    return { success: true, message: "Aktivite başarıyla onaylandı." };
  } catch (error: any) {
    console.error(`[Action Log - handleApproveActivityAction] Error approving activity ${activityId}:`, error);
    let specificMessage = "Bilinmeyen bir sunucu hatası oluştu.";
    if (error && typeof error.message === 'string') {
      specificMessage = error.message;
    } else if (typeof error === 'string') {
      specificMessage = error;
    } else if (error && typeof error.toString === 'function') {
      specificMessage = error.toString();
    }
    return { success: false, message: `Aktivite onaylanırken bir hata oluştu: ${specificMessage}` };
  }
}

export async function handleRejectActivityAction(
    activityId: string,
    projectId: string,
    managerFeedback?: string,
    idToken?: string | null 
): Promise<UpdateActivityStatusFormState> {
  console.log(`[Action Log - handleRejectActivityAction] Action invoked for activity ${activityId}. Admin SDK Initialized: ${adminInitialized}`);
  if (!adminInitialized) {
    const errorMessage = `Sunucu yapılandırma hatası: Firebase Admin SDK başlatılamadı. Detay: ${adminInitializationError || "Bilinmeyen Admin SDK başlatma hatası."}`;
    console.error(`[Action Log - handleRejectActivityAction] CRITICAL: Firebase Admin SDK not initialized. Error: ${adminInitializationError}`);
    return { success: false, message: errorMessage };
  }
  try {
    const isManager = await checkManagerOrAdminPrivileges(idToken); // Assumes robust
    if (!isManager) {
      console.warn("[Action Log - handleRejectActivityAction] Unauthorized attempt to reject activity.");
      return { success: false, message: "Bu işlemi yapma yetkiniz yok." };
    }

    if (!activityId || !projectId) {
        console.error("[Action Log - handleRejectActivityAction] Activity ID or Project ID is missing.");
        return { success: false, message: "Aktivite ID ve Proje ID zorunludur." };
    }
     if (typeof projectId !== 'string' || projectId.trim() === "") {
      console.error("[Action Log - handleRejectActivityAction] Invalid or missing projectId.");
      return { success: false, message: "Proje ID'si eksik veya geçersiz." };
    }
    const updates: Partial<ProjectActivity> = { 
        status: 'rejected',
        managerFeedback: managerFeedback && managerFeedback.trim() !== "" ? managerFeedback.trim() : null
    };
    await updateProjectActivity(activityId, updates); // Assumes robust
    revalidatePath(`/projects/${projectId}`);
    console.log(`[Action Log - handleRejectActivityAction] Successfully rejected activity ${activityId}.`);
    return { success: true, message: "Aktivite reddedildi." };
  } catch (error: any) {
    console.error(`[Action Log - handleRejectActivityAction] Error rejecting activity ${activityId}:`, error);
    let specificMessage = "Bilinmeyen bir sunucu hatası oluştu.";
    if (error && typeof error.message === 'string') {
      specificMessage = error.message;
    } else if (typeof error === 'string') {
      specificMessage = error;
    } else if (error && typeof error.toString === 'function') {
      specificMessage = error.toString();
    }
    return { success: false, message: `Aktivite reddedilirken bir hata oluştu: ${specificMessage}` };
  }
}

interface UpdateProjectResult {
  success: boolean;
  message: string;
}

export async function handleUpdateProjectAction(
  prevState: UpdateProjectResult | undefined,
  formData: FormData
): Promise<UpdateProjectResult> {
  console.log("[Action Log - UpdateProject] Action invoked. Admin SDK Initialized:", adminInitialized);
  
  if (!adminInitialized) {
    const errorMessage = `Sunucu yapılandırma hatası: Firebase Admin SDK başlatılamadı. Detay: ${adminInitializationError || "Bilinmeyen Admin SDK başlatma hatası."}`;
    console.error(`[Action Log - UpdateProject] CRITICAL: Firebase Admin SDK not initialized. Error: ${adminInitializationError}`);
    return { success: false, message: errorMessage };
  }
  if (!STORAGE_BUCKET_NAME) {
    console.error("[Action Log - UpdateProject] CRITICAL: Firebase Storage bucket name (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) is not configured.");
    return { success: false, message: "Sunucu yapılandırma hatası: Depolama alanı adı tanımlanmamış." };
  }

  try {
    const idToken = formData.get('idToken') as string | null;
    const projectId = formData.get('projectId') as string;

    if (!projectId || typeof projectId !== 'string' || projectId.trim() === "") {
      console.error("[Action Log - UpdateProject] Invalid or missing projectId in formData.");
      return { success: false, message: "Proje ID'si form verilerinde eksik veya geçersiz." };
    }

    const idTokenLength = idToken ? idToken.length : 'N/A';
    console.log(`[Action Log - UpdateProject] Extracted form data. Project ID: ${projectId}, ID Token length: ${idTokenLength}`);
    
    const isAuthorized = await checkManagerOrAdminPrivileges(idToken); // Assumes robust
    if (!isAuthorized) {
      console.warn("[Action Log - UpdateProject] User is not authorized to update project.");
      return { success: false, message: "Bu işlemi yapma yetkiniz bulunmamaktadır veya kimlik doğrulama başarısız oldu. Lütfen sunucu loglarını kontrol edin." };
    }
    
    const projectData: Partial<ProjectEditFormData> = {
      projectName: formData.get('projectName') as string,
      responsiblePersons: formData.getAll('responsiblePersons') as string[],
      status: formData.get('status') as string,
      hotel: formData.get('hotel') as string,
      description: formData.get('description') as string | undefined,
    };

    const startDateString = formData.get('startDate') as string;
    if (startDateString) projectData.startDate = new Date(startDateString);
    else projectData.startDate = null; 

    const endDateString = formData.get('endDate') as string;
    if (endDateString) projectData.endDate = new Date(endDateString);
    else {
      // If end date is critical and must always be present.
      // If it can be optional, then remove this check or handle it appropriately.
      console.error("[Action Log - UpdateProject] End date is missing from form data.");
      return { success: false, message: "Bitiş tarihi zorunludur." };
    }

    const projectFile = formData.get('projectFile') as File | null;
    const deleteExistingFile = formData.get('deleteExistingFile') === 'true';

    console.log(`[Action Log - UpdateProject] Project File details: Name: ${projectFile?.name || 'Yok'}, Size: ${projectFile?.size || 'N/A'}, Delete Existing: ${deleteExistingFile}`);

    let currentProject: ProjectType | null = null;
    try {
      console.log(`[Action Log - UpdateProject] Fetching current project details for ID: ${projectId}`);
      currentProject = await getProjectById(projectId); // Assumes getProjectById is robust
      if (!currentProject) {
        console.error(`[Action Log - UpdateProject] Project (ID: ${projectId}) not found.`);
        return { success: false, message: `Proje (ID: ${projectId}) bulunamadı.` };
      }
      console.log(`[Action Log - UpdateProject] Current project details fetched. Existing file URL: ${currentProject.projectFileURL || 'Yok'}`);
    } catch (e: any) {
      console.error(`[Action Log - UpdateProject] Error fetching current project ${projectId}: ${e.message}`, e);
      return { success: false, message: `Mevcut proje bilgileri alınırken hata: ${e.message}` };
    }

    let newFileURL: string | undefined | null = currentProject.projectFileURL;
    let newStoragePath: string | undefined | null = currentProject.projectStoragePath;
    const bucket = admin.storage().bucket(STORAGE_BUCKET_NAME);

    if (deleteExistingFile && currentProject.projectStoragePath) {
      console.log(`[Action Log - UpdateProject] Attempting to delete existing file: ${currentProject.projectStoragePath}`);
      try {
        await bucket.file(currentProject.projectStoragePath).delete();
        console.log(`[Action Log - UpdateProject] Successfully deleted old file: ${currentProject.projectStoragePath}`);
        newFileURL = null;
        newStoragePath = null;
      } catch (e: any) {
        console.warn(`[Action Log - UpdateProject] Error deleting old file ${currentProject.projectStoragePath}: ${e.message}. Continuing project update without file change.`);
        // Do not rethrow, allow project metadata to be updated.
      }
    }

    if (projectFile && projectFile.size > 0) {
      if (!deleteExistingFile && currentProject.projectStoragePath) { // If not explicitly deleting, but new file provided, delete old one.
        console.log(`[Action Log - UpdateProject] Replacing old file. Attempting to delete: ${currentProject.projectStoragePath}`);
        try {
          await bucket.file(currentProject.projectStoragePath).delete();
          console.log(`[Action Log - UpdateProject] Successfully deleted old file before new upload: ${currentProject.projectStoragePath}`);
        } catch (e: any) {
          console.warn(`[Action Log - UpdateProject] Could not delete old file ${currentProject.projectStoragePath} before new upload: ${e.message}. New file will still be uploaded.`);
        }
      }

      const uniqueFileName = `${Date.now()}-${projectFile.name.replace(/\s+/g, '_')}`;
      const filePath = `project-files/${projectId}/${uniqueFileName}`;
      console.log(`[Action Log - UpdateProject] Uploading new file to: ${filePath}. File size: ${projectFile.size}, type: ${projectFile.type}`);
      try {
        const fileBuffer = Buffer.from(await projectFile.arrayBuffer());
        console.log(`[Action Log - UpdateProject] File buffer created for new file. Length: ${fileBuffer.length}`);
        const storageFile = bucket.file(filePath);
        await storageFile.save(fileBuffer, { metadata: { contentType: projectFile.type || 'application/octet-stream' } });
        console.log(`[Action Log - UpdateProject] New file saved to Storage. Making public...`);
        await storageFile.makePublic();
        newFileURL = storageFile.publicUrl();
        newStoragePath = filePath;
        console.log(`[Action Log - UpdateProject] New file uploaded. URL: ${newFileURL}`);
      } catch (e: any) {
        console.error(`[Action Log - UpdateProject] Error uploading new project file: ${e.message}`, e);
        return { success: false, message: `Yeni proje dosyası yüklenirken hata: ${e.message}. Lütfen sunucu loglarını kontrol edin.` };
      }
    }

    projectData.projectFileURL = newFileURL;
    projectData.projectStoragePath = newStoragePath;
    
    console.log("[Action Log - UpdateProject] Data to be passed to updateProject service:", JSON.stringify(projectData, null, 2));

    await updateProject(projectId, projectData as Required<ProjectEditFormData>); // Assumes updateProject is robust
    console.log(`[Action Log - UpdateProject] Project ${projectId} Firestore document update initiated. Attempting to revalidate paths...`);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/projects');
    console.log(`[Action Log - UpdateProject] Project ${projectId} successfully updated and paths revalidated.`);
    return { success: true, message: "Proje başarıyla güncellendi." };

  } catch (e: any) {
    console.error("[Action Log - UpdateProject] CRITICAL UNHANDLED EXCEPTION in action:", e);
    let specificMessage = "Bilinmeyen bir sunucu hatası oluştu.";
     if (e && typeof e.message === 'string') {
      specificMessage = e.message;
    } else if (typeof e === 'string') {
      specificMessage = e;
    } else if (e && typeof e.toString === 'function') {
      specificMessage = e.toString();
    }
    if (e && typeof e.code === 'string') {
        specificMessage += ` (Kod: ${e.code})`;
    }
    console.error("[Action Log - UpdateProject] Responding with error:", specificMessage);
    return { 
        success: false, 
        message: `Proje güncellenirken beklenmedik bir sunucu hatası oluştu. Detay: ${specificMessage}` 
    };
  }
}
    

