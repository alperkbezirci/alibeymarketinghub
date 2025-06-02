
// src/app/(app)/projects/[id]/actions.ts
"use server";

import { revalidatePath } from 'next/cache';
import { addProjectActivity, updateProjectActivity, type ProjectActivityInputData, type ProjectActivityStatus } from '@/services/project-activity-service';
import { auth } from '@/lib/firebase'; // To get current user if needed indirectly, though user info should come from form/client

interface AddActivityFormState {
  success: boolean;
  message: string;
  activityId?: string;
}

export async function handleAddProjectActivityAction(
  prevState: AddActivityFormState | undefined,
  formData: FormData
): Promise<AddActivityFormState> {
  const projectId = formData.get('projectId') as string;
  const userId = formData.get('userId') as string; // Should be current authenticated user's ID
  const userName = formData.get('userName') as string; // Should be current authenticated user's display name
  const userPhotoURL = formData.get('userPhotoURL') as string | undefined;
  const content = formData.get('content') as string;
  const fileInput = formData.get('file') as File | null;

  if (!projectId || !userId || !userName) {
    return { success: false, message: "Proje ID, kullanıcı ID ve kullanıcı adı zorunludur." };
  }
  if (!content && (!fileInput || fileInput.size === 0)) {
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
    // For now, we're just saving metadata.
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
    status: 'information', // Or 'draft' if you want explicit user submission for comments/files
  };

  try {
    const newActivity = await addProjectActivity(activityData);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `${activityType === 'comment' ? 'Yorum' : 'Dosya'} başarıyla eklendi.`, activityId: newActivity.id };
  } catch (error: any) {
    return { success: false, message: error.message || "Aktivite eklenirken bir hata oluştu." };
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
        if (messageForManager) {
            updates.messageForManager = messageForManager;
        }
        await updateProjectActivity(activityId, updates);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Aktivite durumu başarıyla güncellendi." };
    } catch (error: any) {
        return { success: false, message: error.message || "Aktivite durumu güncellenirken bir hata oluştu." };
    }
}
