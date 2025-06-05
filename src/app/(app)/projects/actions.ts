
// src/app/(app)/projects/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { admin } from '@/lib/firebase-admin';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus, type ProjectActivity, type ProjectActivityType } from '@/services/project-activity-service';
import type { DecodedIdToken } from 'firebase-admin/auth';
// Removed client storage imports as they are not used in server actions directly for uploads
import { db } from '@/lib/firebase'; // Client SDK Firestore for activity update
import { USER_ROLES } from '@/lib/constants';
import { getUserRoles } from '@/services/user-service';
import { getProjectById, updateProject, type ProjectEditFormData } from '@/services/project-service'; // Added updateProject, ProjectEditFormData


const STORAGE_BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

interface AddActivityFormState {
  success: boolean;
  message: string;
  activityId?: string;
}

async function verifyIdTokenAndGetUserDetails(idToken: string): Promise<{ uid: string; name: string; photoURL?: string } | null> {
  if (!admin.apps.length) {
    console.error("[Project Action - verifyIdToken] Firebase Admin SDK is not initialized.");
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
    console.error("[Project Action - verifyIdToken] Error verifying ID token:", error.message);
    return null;
  }
}


async function checkManagerOrAdminPrivileges(idToken?: string | null): Promise<boolean> {
    if (!idToken) {
        console.warn("[Project Action - checkManagerOrAdminPrivileges] No ID token provided.");
        return false;
    }
    if (!admin.apps.length) {
      console.error("[Project Action - checkManagerOrAdminPrivileges] Firebase Admin SDK is not initialized. Cannot check privileges.");
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

  if (!STORAGE_BUCKET_NAME) {
    console.error("[Action Log - handleAddProjectActivityAction] Firebase Storage bucket name is not configured. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable.");
    return { success: false, message: "Sunucu yapılandırma hatası: Depolama alanı tanımlanmamış." };
  }

  if (!admin.apps.length) {
    console.error("[Action Log - handleAddProjectActivityAction] Firebase Admin SDK is not initialized. File operations will fail.");
    return { success: false, message: "Sunucu yapılandırma hatası: Admin SDK başlatılamadı." };
  }

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
    // hotel: projectHotel, // hotel field removed from ProjectActivityInputData
  };

  let newActivityId: string;
  try {
    const preliminaryActivity = await addProjectActivity(initialActivityData); // This will now use the updated ProjectActivityInputData
    newActivityId = preliminaryActivity.id;
    console.log(`[Action Log] Preliminary activity document created with ID: ${newActivityId}`);
  } catch (error: any) {
    console.error("[Action Log] Error creating preliminary activity document:", error);
    return { success: false, message: `Aktivite ön kaydı oluşturulurken bir hata oluştu: ${error.message}` };
  }
  
  let finalActivityType = initialActivityData.type;
  let finalFileURL: string | undefined;
  let finalStoragePath: string | undefined;

  if (fileInput && fileInput.size > 0) {
    finalStoragePath = `project-activities/${projectId}/${newActivityId}/${fileInput.name}`;
    console.log(`[Action Log] Attempting to upload file to Storage: ${finalStoragePath}`);

    try {
      const bucket = admin.storage().bucket(STORAGE_BUCKET_NAME);
      const fileBuffer = Buffer.from(await fileInput.arrayBuffer());
      const storageFile = bucket.file(finalStoragePath);
      
      await storageFile.save(fileBuffer, { metadata: { contentType: fileInput.type } });
      await storageFile.makePublic(); // Ensure file is public if direct URL access is needed
      finalFileURL = storageFile.publicUrl();

      console.log(`[Action Log] File uploaded successfully. URL: ${finalFileURL}`);

      await updateProjectActivity(newActivityId, { 
        fileURL: finalFileURL, 
        storagePath: finalStoragePath, 
        type: 'file_upload' // Ensure type is file_upload if it wasn't already
      }); 
      console.log(`[Action Log] Activity document ${newActivityId} updated with file details.`);
      finalActivityType = 'file_upload';

    } catch (uploadError: any) {
      console.error("[Action Log] Error uploading file to Firebase Storage or updating Firestore:", uploadError);
      // Attempt to delete the preliminary activity document if file upload fails
      try {
        // This would require a deleteActivity service function or direct firestore call
        console.warn(`[Action Log] Cleanup: Attempt to delete preliminary activity ${newActivityId} after failed upload (not implemented).`);
      } catch (cleanupError) {
        console.error(`[Action Log] Error cleaning up preliminary activity ${newActivityId}:`, cleanupError);
      }
      return { success: false, message: `Dosya yüklenirken veya aktivite güncellenirken hata: ${uploadError.message}` };
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return { 
    success: true, 
    message: `${finalActivityType === 'comment' ? 'Yorum taslağı' : 'Dosya taslağı'} başarıyla eklendi. Onaya gönderebilirsiniz.`, 
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
    
    if (!idToken) {
        return { success: false, message: "Kimlik doğrulama token'ı eksik." };
    }
    const userDetails = await verifyIdTokenAndGetUserDetails(idToken);
    if (!userDetails) {
        return { success: false, message: "Bu işlemi yapmak için kimliğiniz doğrulanamadı." };
    }

    if (newStatus !== 'pending_approval') {
        console.warn("handleUpdateActivityStatusAction called for non-draft status update by user. This should go via approve/reject actions if for managers.");
        return { success: false, message: "Bu durum güncellemesi yetkiniz dışında veya yanlış arayüzden yapılıyor." };
    }

    if (!activityId || !newStatus) {
        return { success: false, message: "Aktivite ID ve yeni durum zorunludur." };
    }
    console.log(`[Action Log] handleUpdateActivityStatusAction - Updating activity ${activityId} to status ${newStatus} with message: "${messageForManager}" by user ${userDetails.uid}`);
    try {
        const updates: Partial<ProjectActivity> = { status: newStatus };
        
        if (messageForManager && messageForManager.trim() !== "") {
            updates.messageForManager = messageForManager.trim();
        } else {
            updates.messageForManager = null as any; 
        }
        
        await updateProjectActivity(activityId, updates);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Aktivite durumu başarıyla 'Onay Bekliyor' olarak güncellendi." };
    } catch (error: any) {
        console.error("[Action Log] Error in handleUpdateActivityStatusAction:", error);
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
    console.log(`[Action Log] Approving activity ${activityId} for project ${projectId} by manager. Feedback: "${managerFeedback}"`);
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
    console.log(`[Action Log] Rejecting activity ${activityId} for project ${projectId} by manager. Feedback: "${managerFeedback}"`);
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

// --- Project Edit Action ---
interface UpdateProjectResult {
  success: boolean;
  message: string;
}

export async function handleUpdateProjectAction(
  prevState: UpdateProjectResult | undefined,
  formData: FormData
): Promise<UpdateProjectResult> {
  console.log("[Action Log - UpdateProject] Received formData:", Object.fromEntries(formData));

  const idToken = formData.get('idToken') as string | null;
  const projectId = formData.get('projectId') as string;

  if (!STORAGE_BUCKET_NAME) {
    console.error("[Action Log - UpdateProject] Firebase Storage bucket name is not configured.");
    return { success: false, message: "Sunucu yapılandırma hatası: Depolama alanı tanımlanmamış." };
  }
  if (!admin.apps.length) {
    console.error("[Action Log - UpdateProject] Firebase Admin SDK is not initialized.");
    return { success: false, message: "Sunucu yapılandırma hatası: Admin SDK başlatılamadı." };
  }

  const isAuthorized = await checkManagerOrAdminPrivileges(idToken);
  if (!isAuthorized) {
    return { success: false, message: "Bu işlemi yapma yetkiniz bulunmamaktadır." };
  }

  if (!projectId) {
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
  else projectData.startDate = null; // Explicitly set to null if empty

  const endDateString = formData.get('endDate') as string;
  if (endDateString) projectData.endDate = new Date(endDateString);
  else return { success: false, message: "Bitiş tarihi zorunludur."};


  const projectFile = formData.get('projectFile') as File | null;
  const deleteExistingFile = formData.get('deleteExistingFile') === 'true';

  console.log(`[Action Log - UpdateProject] Project ID: ${projectId}`);
  console.log(`[Action Log - UpdateProject] New Project File: ${projectFile?.name || 'Yok'}`);
  console.log(`[Action Log - UpdateProject] Delete Existing File: ${deleteExistingFile}`);

  let currentProject: Project | null = null;
  try {
    currentProject = await getProjectById(projectId);
    if (!currentProject) {
      return { success: false, message: `Proje (ID: ${projectId}) bulunamadı.` };
    }
  } catch (e: any) {
    console.error(`[Action Log - UpdateProject] Error fetching current project ${projectId}: ${e.message}`);
    return { success: false, message: `Mevcut proje bilgileri alınırken hata: ${e.message}` };
  }

  // File handling logic
  let newFileURL: string | undefined | null = currentProject.projectFileURL;
  let newStoragePath: string | undefined | null = currentProject.projectStoragePath;

  const bucket = admin.storage().bucket(STORAGE_BUCKET_NAME);

  // If "delete existing file" is checked and there's an old file
  if (deleteExistingFile && currentProject.projectStoragePath) {
    console.log(`[Action Log - UpdateProject] Deleting existing file: ${currentProject.projectStoragePath}`);
    try {
      await bucket.file(currentProject.projectStoragePath).delete();
      console.log(`[Action Log - UpdateProject] Successfully deleted old file: ${currentProject.projectStoragePath}`);
      newFileURL = null;
      newStoragePath = null;
    } catch (e: any) {
      console.error(`[Action Log - UpdateProject] Error deleting old file ${currentProject.projectStoragePath}: ${e.message}`);
      // Non-fatal, continue with update but log the error
    }
  }

  // If a new file is uploaded
  if (projectFile && projectFile.size > 0) {
    // If there was an old file and it wasn't explicitly marked for deletion, delete it now before uploading new one.
    if (!deleteExistingFile && currentProject.projectStoragePath) {
      console.log(`[Action Log - UpdateProject] Deleting old file ${currentProject.projectStoragePath} before uploading new one.`);
      try {
        await bucket.file(currentProject.projectStoragePath).delete();
        console.log(`[Action Log - UpdateProject] Successfully deleted old file: ${currentProject.projectStoragePath}`);
      } catch (e: any) {
        console.warn(`[Action Log - UpdateProject] Could not delete old file ${currentProject.projectStoragePath} before new upload: ${e.message}`);
        // Continue, new file might overwrite or upload with unique name strategy is important
      }
    }

    const uniqueFileName = `${Date.now()}-${projectFile.name.replace(/\s+/g, '_')}`; // Basic unique name
    const filePath = `project-files/${projectId}/${uniqueFileName}`;
    console.log(`[Action Log - UpdateProject] Uploading new file to: ${filePath}`);
    try {
      const fileBuffer = Buffer.from(await projectFile.arrayBuffer());
      const storageFile = bucket.file(filePath);
      await storageFile.save(fileBuffer, { metadata: { contentType: projectFile.type } });
      await storageFile.makePublic(); // Ensure new file is public
      newFileURL = storageFile.publicUrl();
      newStoragePath = filePath;
      console.log(`[Action Log - UpdateProject] New file uploaded. URL: ${newFileURL}`);
    } catch (e: any) {
      console.error(`[Action Log - UpdateProject] Error uploading new file: ${e.message}`);
      return { success: false, message: `Yeni dosya yüklenirken hata: ${e.message}` };
    }
  }

  projectData.projectFileURL = newFileURL;
  projectData.projectStoragePath = newStoragePath;
  
  console.log("[Action Log - UpdateProject] Data to be passed to updateProject service:", projectData);

  try {
    await updateProject(projectId, projectData as Required<ProjectEditFormData>); // Cast assuming all required fields are present or handled
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/projects');
    return { success: true, message: "Proje başarıyla güncellendi." };
  } catch (error: any) {
    console.error(`[Action Log - UpdateProject] Error updating project in Firestore for ID ${projectId}:`, error);
    return { success: false, message: `Proje güncellenirken bir hata oluştu: ${error.message}` };
  }
}

// Make sure ProjectEditFormData is correctly defined in project-service.ts
// and that updateProject service handles null values for dates/files correctly.
    
