
// src/app/(app)/projects/[id]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus } from '@/services/project-activity-service';
import { auth } from '@/lib/firebase'; 

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
  const userPhotoURL = formData.get('userPhotoURL') as string | undefined;
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

  let activityType: ProjectActivityInputData['type'] = 'comment';
  let fileName: string | undefined;
  let fileType: string | undefined;

  if (fileInput && fileInput.size > 0) {
    activityType = 'file_upload';
    fileName = fileInput.name;
    fileType = fileInput.type;
    // TODO: Actual file upload to Firebase Storage would happen here
  }

  const activityData: ProjectActivityInputData = {
    projectId,
    userId,
    userName,
    userPhotoURL: userPhotoURL || undefined,
    type: activityType,
    content: content || undefined,
    fileName,
    fileType,
    status: 'information', 
  };
  console.log("[Action Log] handleAddProjectActivityAction - Activity data to be saved:", activityData);

  try {
    const newActivity = await addProjectActivity(activityData);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `${activityType === 'comment' ? 'Yorum' : 'Dosya'} başarıyla eklendi.`, activityId: newActivity.id };
  } catch (error: any) {
    // Log the full error object for more details, especially for Firebase errors
    console.error("[Action Log] Error in handleAddProjectActivityAction when calling service:", error);
    return { success: false, message: error.message || "Aktivite eklenirken bir sunucu hatası oluştu." };
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
    try {
        const updates: Partial<ProjectActivity> = { status: newStatus };
        if (messageForManager && messageForManager.trim() !== "") { // Ensure messageForManager is not just whitespace
            updates.messageForManager = messageForManager.trim();
        }
        await updateProjectActivity(activityId, updates);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Aktivite durumu başarıyla güncellendi." };
    } catch (error: any) {
        console.error("[Action Log] Error in handleUpdateActivityStatusAction:", error);
        return { success: false, message: error.message || "Aktivite durumu güncellenirken bir hata oluştu." };
    }
}
