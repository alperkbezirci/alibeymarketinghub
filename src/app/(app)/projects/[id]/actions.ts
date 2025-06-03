
// src/app/(app)/projects/[id]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus, type ProjectActivityType, type ProjectActivity } from '@/services/project-activity-service';
// import { auth } from '@/lib/firebase'; // Not directly used here, user info comes from form

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
  const userId = formData.get('userId') as string; 
  const userName = formData.get('userName') as string; 
  const userPhotoURL = formData.get('userPhotoURL') as string | null; // Can be null
  const content = formData.get('content') as string;
  const fileInput = formData.get('file') as File | null;

  if (!projectId || !userId || !userName) {
    console.error("[Action Log] Validation Error: Missing projectId, userId, or userName.");
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
    // TODO: Actual file upload to Firebase Storage would happen here if implemented
    console.log(`[Action Log] File detected: ${fileName}, Type: ${fileType}. Actual upload to Storage not implemented yet.`);
  }

  // New activities (comments/files) will default to 'draft' status
  const initialStatus: ProjectActivityStatus = 'draft';

  const activityData: ProjectActivityInputData = {
    projectId,
    userId,
    userName,
    userPhotoURL: userPhotoURL || undefined, // Send undefined if null or empty
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
    // Log the full error object for more details, especially for Firebase errors
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
    if (!activityId || !newStatus) {
        return { success: false, message: "Aktivite ID ve yeni durum zorunludur." };
    }
    console.log(`[Action Log] handleUpdateActivityStatusAction - Updating activity ${activityId} to status ${newStatus} with message: "${messageForManager}"`);
    try {
        const updates: Partial<ProjectActivity> = { status: newStatus };
        
        if (messageForManager && messageForManager.trim() !== "") {
            updates.messageForManager = messageForManager.trim();
        } else {
            // If message is empty or whitespace, set field to null instead of undefined
            updates.messageForManager = null as any; // Cast to any to satisfy Partial, or adjust ProjectActivity interface
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

