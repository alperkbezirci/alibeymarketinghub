
// src/app/(app)/projects/[id]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { admin, adminInitialized, adminInitializationError } from '@/lib/firebase-admin';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus, type ProjectActivity, type ProjectActivityType } from '@/services/project-activity-service';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"; // Client SDK storage
import { db } from '@/lib/firebase'; // Client SDK Firestore for activity update
import { USER_ROLES } from '@/lib/constants';
import { getUserRoles } from '@/services/user-service';
import { getProjectById, updateProject, type ProjectEditFormData, type Project } from '@/services/project-service';


const STORAGE_BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

interface AddActivityFormState {
  success: boolean;
  message: string;
  activityId?: string;
}

async function verifyIdTokenAndGetUserDetails(idToken: string): Promise<{ uid: string; name:string; photoURL?: string } | null> {
  console.log(`[Action Log - verifyIdTokenAndGetUserDetails] Firebase Admin SDK is initialized: ${adminInitialized}`);
  console.log(`[Action Log - verifyIdTokenAndGetUserDetails] Received idToken length: ${idToken?.length}`);
  
  if (!adminInitialized) {
    console.error("[Action Log - verifyIdTokenAndGetUserDetails] Firebase Admin SDK is not initialized. Cannot verify ID token. Initialization error:", adminInitializationError);
    return null;
  }
  if (!idToken || idToken.trim() === "") {
    console.error("[Action Log - verifyIdTokenAndGetUserDetails] Received idToken is null or empty.");
    return null;
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(`[Action Log - verifyIdTokenAndGetUserDetails] Successfully verified ID token for UID: ${decodedToken.uid}`);
    return {
      uid: decodedToken.uid,
      name: decodedToken.name || decodedToken.email || decodedToken.uid,
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
    console.log(`[Action Log - checkManagerOrAdminPrivileges] Firebase Admin SDK is initialized: ${adminInitialized}`);
    console.log(`[Action Log - checkManagerOrAdminPrivileges] Checking privileges. ID token present: ${!!idToken}`);
    
    if (!adminInitialized) {
        console.error("[Action Log - checkManagerOrAdminPrivileges] Firebase Admin SDK is not initialized. Admin check failed. Initialization error:", adminInitializationError);
        return false;
    }
    if (!idToken) {
        console.warn("[Action Log - checkManagerOrAdminPrivileges] No ID token provided.");
        return false;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const roles = await getUserRoles(decodedToken.uid);
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
  console.log("[Action Log - handleAddProjectActivityAction] Action invoked."); // VERY FIRST LOG

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

    console.log(`[Action Log - handleAddProjectActivityAction] Extracted form data. Project ID: ${projectId}, Content present: ${!!content}, File name: ${fileInput?.name || 'Yok'}, File size: ${fileInput?.size || 'N/A'}, ID Token present: ${!!idToken}`);

    if (!idToken) {
      console.error("[Action Log - handleAddProjectActivityAction] ID Token is missing.");
      return { success: false, message: "Kimlik doğrulama token'ı bulunamadı. Lütfen tekrar giriş yapmayı deneyin." };
    }

    const userDetails = await verifyIdTokenAndGetUserDetails(idToken);

    if (!userDetails) {
      console.error("[Action Log - handleAddProjectActivityAction] User details could not be verified from ID Token.");
      return { success: false, message: "Kullanıcı kimliği doğrulanamadı. Oturumunuz zaman aşımına uğramış olabilir veya geçersiz bir token gönderdiniz. Sunucu loglarını kontrol edin." };
    }

    const { uid: serverVerifiedUserId, name: serverVerifiedUserName, photoURL: serverVerifiedUserPhotoURL } = userDetails;
    console.log(`[Action Log - handleAddProjectActivityAction] Server-verified user: UID=${serverVerifiedUserId}, Name=${serverVerifiedUserName}`);

    if (!projectId) {
      console.error("[Action Log - handleAddProjectActivityAction] Validation Error: Missing projectId.");
      return { success: false, message: "Proje ID zorunludur." };
    }
    if (!content && (!fileInput || fileInput.size === 0)) {
      console.error("[Action Log - handleAddProjectActivityAction] Validation Error: Content or file must be provided.");
      return { success: false, message: "Yorum veya dosya eklemelisiniz." };
    }

    let projectHotel: string | undefined;
    try {
      console.log(`[Action Log - handleAddProjectActivityAction] Fetching project details for ID: ${projectId} to get hotel info.`);
      const projectDetails = await getProjectById(projectId);
      if (projectDetails) {
        projectHotel = projectDetails.hotel;
        console.log(`[Action Log - handleAddProjectActivityAction] Fetched hotel '${projectHotel}' for project '${projectId}'`);
      } else {
        console.warn(`[Action Log - handleAddProjectActivityAction] Project with ID ${projectId} not found when trying to get hotel info for activity.`);
      }
    } catch (projectError: any) {
      console.error(`[Action Log - handleAddProjectActivityAction] Error fetching project details for hotel info: ${projectError.message}`, projectError);
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
    };
    console.log("[Action Log - handleAddProjectActivityAction] Prepared initial activity data:", JSON.stringify(initialActivityData, null, 2));


    let newActivityId: string;
    try {
      console.log("[Action Log - handleAddProjectActivityAction] Attempting to create preliminary activity document in Firestore...");
      const preliminaryActivity = await addProjectActivity(initialActivityData);
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
      storagePath = `project-activities/${projectId}/${newActivityId}/${fileInput.name}`;
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
            metadata: { contentType: fileInput.type },
        });
        console.log(`[Action Log - handleAddProjectActivityAction] File saved to Storage. Attempting to make public...`);
        
        await storageFile.makePublic();
        console.log(`[Action Log - handleAddProjectActivityAction] File made public. Attempting to get public URL...`);
        fileURL = storageFile.publicUrl();
        console.log(`[Action Log - handleAddProjectActivityAction] File uploaded successfully. URL: ${fileURL}`);

        console.log(`[Action Log - handleAddProjectActivityAction] Attempting to update activity document ${newActivityId} with file details...`);
        await updateProjectActivity(newActivityId, { fileURL, storagePath, type: 'file_upload' }); 
        console.log(`[Action Log - handleAddProjectActivityAction] Activity document ${newActivityId} updated with file details.`);

      } catch (uploadError: any) {
        console.error("[Action Log - handleAddProjectActivityAction] Error during file upload or Firestore update for file details:", uploadError.message, uploadError.code ? `(Code: ${uploadError.code})` : '', uploadError);
        return { success: false, message: `Dosya yüklenirken veya aktivite güncellenirken hata: ${uploadError.message}` };
      }
    }

    console.log(`[Action Log - handleAddProjectActivityAction] Attempting to revalidate path: /projects/${projectId}`);
    revalidatePath(`/projects/${projectId}`);
    console.log(`[Action Log - handleAddProjectActivityAction] Successfully added activity. Type: ${finalActivityType}. Revalidating path /projects/${projectId}`);
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
  console.log(`[Action Log - handleUpdateActivityStatusAction] Action invoked for activity ${activityId}, new status ${newStatus}.`);
  if (!adminInitialized) {
    return { success: false, message: `Sunucu yapılandırma hatası: Firebase Admin SDK başlatılamadı. Detay: ${adminInitializationError}` };
  }
  try {
    if (!idToken) {
      console.error("[Action Log - handleUpdateActivityStatusAction] ID Token is missing.");
      return { success: false, message: "Kimlik doğrulama token'ı eksik." };
    }
    const userDetails = await verifyIdTokenAndGetUserDetails(idToken);
    if (!userDetails) {
      console.error("[Action Log - handleUpdateActivityStatusAction] User details could not be verified.");
      return { success: false, message: "Bu işlemi yapmak için kimliğiniz doğrulanamadı." };
    }
    
    if (newStatus !== 'pending_approval') {
        console.warn("[Action Log - handleUpdateActivityStatusAction] This action is only for 'pending_approval'. Other statuses should use specific approve/reject actions.");
        return { success: false, message: "Bu durum güncellemesi yetkiniz dışında veya yanlış arayüzden yapılıyor." };
    }

    if (!activityId || !newStatus) {
        console.error("[Action Log - handleUpdateActivityStatusAction] Activity ID or new status is missing.");
        return { success: false, message: "Aktivite ID ve yeni durum zorunludur." };
    }
    
    const updates: Partial<ProjectActivity> = { status: newStatus };
    
    if (messageForManager && messageForManager.trim() !== "") {
        updates.messageForManager = messageForManager.trim();
    } else {
        updates.messageForManager = null as any; 
    }
    
    await updateProjectActivity(activityId, updates);
    revalidatePath(`/projects/${projectId}`);
    console.log(`[Action Log - handleUpdateActivityStatusAction] Successfully updated activity ${activityId} to status ${newStatus}.`);
    return { success: true, message: "Aktivite durumu başarıyla 'Onay Bekliyor' olarak güncellendi." };

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
  console.log(`[Action Log - handleApproveActivityAction] Action invoked for activity ${activityId}.`);
  if (!adminInitialized) {
    return { success: false, message: `Sunucu yapılandırma hatası: Firebase Admin SDK başlatılamadı. Detay: ${adminInitializationError}` };
  }
  try {
    const isManager = await checkManagerOrAdminPrivileges(idToken);
    if (!isManager) {
      console.warn("[Action Log - handleApproveActivityAction] Unauthorized attempt to approve activity.");
      return { success: false, message: "Bu işlemi yapma yetkiniz yok." };
    }

    if (!activityId || !projectId) {
        console.error("[Action Log - handleApproveActivityAction] Activity ID or Project ID is missing.");
        return { success: false, message: "Aktivite ID ve Proje ID zorunludur." };
    }
    const updates: Partial<ProjectActivity> = { 
        status: 'approved',
        managerFeedback: managerFeedback && managerFeedback.trim() !== "" ? managerFeedback.trim() : null
    };
    await updateProjectActivity(activityId, updates);
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
  console.log(`[Action Log - handleRejectActivityAction] Action invoked for activity ${activityId}.`);
  if (!adminInitialized) {
    return { success: false, message: `Sunucu yapılandırma hatası: Firebase Admin SDK başlatılamadı. Detay: ${adminInitializationError}` };
  }
  try {
    const isManager = await checkManagerOrAdminPrivileges(idToken);
    if (!isManager) {
      console.warn("[Action Log - handleRejectActivityAction] Unauthorized attempt to reject activity.");
      return { success: false, message: "Bu işlemi yapma yetkiniz yok." };
    }

    if (!activityId || !projectId) {
        console.error("[Action Log - handleRejectActivityAction] Activity ID or Project ID is missing.");
        return { success: false, message: "Aktivite ID ve Proje ID zorunludur." };
    }
    const updates: Partial<ProjectActivity> = { 
        status: 'rejected',
        managerFeedback: managerFeedback && managerFeedback.trim() !== "" ? managerFeedback.trim() : null
    };
    await updateProjectActivity(activityId, updates);
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
  console.log("[Action Log - UpdateProject] Action invoked.");
  
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

    console.log(`[Action Log - UpdateProject] Extracted form data. Project ID: ${projectId}, ID Token present: ${!!idToken}`);
    
    const isAuthorized = await checkManagerOrAdminPrivileges(idToken); 
    if (!isAuthorized) {
      console.warn("[Action Log - UpdateProject] User is not authorized to update project.");
      return { success: false, message: "Bu işlemi yapma yetkiniz bulunmamaktadır veya kimlik doğrulama başarısız oldu." };
    }

    if (!projectId) {
      console.error("[Action Log - UpdateProject] Project ID is missing from form data.");
      return { success: false, message: "Proje ID zorunludur." };
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
      console.error("[Action Log - UpdateProject] End date is missing from form data.");
      return { success: false, message: "Bitiş tarihi zorunludur." };
    }

    const projectFile = formData.get('projectFile') as File | null;
    const deleteExistingFile = formData.get('deleteExistingFile') === 'true';

    console.log(`[Action Log - UpdateProject] Project File details: Name: ${projectFile?.name || 'Yok'}, Size: ${projectFile?.size || 'N/A'}, Delete Existing: ${deleteExistingFile}`);

    let currentProject: Project | null = null;
    try {
      console.log(`[Action Log - UpdateProject] Fetching current project details for ID: ${projectId}`);
      currentProject = await getProjectById(projectId);
      if (!currentProject) {
        console.error(`[Action Log - UpdateProject] Project (ID: ${projectId}) not found.`);
        return { success: false, message: `Proje (ID: ${projectId}) bulunamadı.` };
      }
      console.log(`[Action Log - UpdateProject] Current project details fetched. Existing file URL: ${currentProject.projectFileURL}`);
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
        console.error(`[Action Log - UpdateProject] Error deleting old file ${currentProject.projectStoragePath}: ${e.message}`, e);
      }
    }

    if (projectFile && projectFile.size > 0) {
      if (!deleteExistingFile && currentProject.projectStoragePath && currentProject.projectStoragePath !== `project-files/${projectId}/${`${Date.now()}-${projectFile.name.replace(/\s+/g, '_')}`}`) {
        console.log(`[Action Log - UpdateProject] Replacing old file. Attempting to delete: ${currentProject.projectStoragePath}`);
        try {
          await bucket.file(currentProject.projectStoragePath).delete();
          console.log(`[Action Log - UpdateProject] Successfully deleted old file before new upload: ${currentProject.projectStoragePath}`);
        } catch (e: any) {
          console.warn(`[Action Log - UpdateProject] Could not delete old file ${currentProject.projectStoragePath} before new upload: ${e.message}`, e);
        }
      }

      const uniqueFileName = `${Date.now()}-${projectFile.name.replace(/\s+/g, '_')}`;
      const filePath = `project-files/${projectId}/${uniqueFileName}`;
      console.log(`[Action Log - UpdateProject] Uploading new file to: ${filePath}. File size: ${projectFile.size}, type: ${projectFile.type}`);
      try {
        const fileBuffer = Buffer.from(await projectFile.arrayBuffer());
        console.log(`[Action Log - UpdateProject] File buffer created for new file. Length: ${fileBuffer.length}`);
        const storageFile = bucket.file(filePath);
        await storageFile.save(fileBuffer, { metadata: { contentType: projectFile.type } });
        console.log(`[Action Log - UpdateProject] New file saved to Storage. Making public...`);
        await storageFile.makePublic();
        newFileURL = storageFile.publicUrl();
        newStoragePath = filePath;
        console.log(`[Action Log - UpdateProject] New file uploaded. URL: ${newFileURL}`);
      } catch (e: any) {
        console.error(`[Action Log - UpdateProject] Error uploading new project file: ${e.message}`, e);
        return { success: false, message: `Yeni proje dosyası yüklenirken hata: ${e.message}` };
      }
    }

    projectData.projectFileURL = newFileURL;
    projectData.projectStoragePath = newStoragePath;
    
    console.log("[Action Log - UpdateProject] Data to be passed to updateProject service:", JSON.stringify(projectData, null, 2));

    await updateProject(projectId, projectData as Required<ProjectEditFormData>); 
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
    

    