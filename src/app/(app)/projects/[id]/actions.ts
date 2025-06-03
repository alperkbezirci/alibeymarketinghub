
// src/app/(app)/projects/[id]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus, type ProjectActivityType, type ProjectActivity } from '@/services/project-activity-service';

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
  const userPhotoURL = formData.get('userPhotoURL') as string | null;
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
    console.log(`[Action Log] File detected: ${fileName}, Type: ${fileType}. Actual upload to Storage not implemented yet.`);
  }

  const initialStatus: ProjectActivityStatus = 'draft';

  const activityData: ProjectActivityInputData = {
    projectId,
    userId,
    userName,
    userPhotoURL: userPhotoURL || undefined,
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
    if (!activityId || !projectId) {
        return { success: false, message: "Aktivite ID ve Proje ID zorunludur." };
    }
    if (!managerFeedback || managerFeedback.trim() === "") {
        // Forcing feedback on rejection might be a good practice
        // return { success: false, message: "Reddetme işlemi için geri bildirim zorunludur." };
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
