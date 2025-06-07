
// src/app/(app)/cms/actions.ts
"use server";

import { admin } from '@/lib/firebase-admin';
import { getUserRoles } from '@/services/user-service';
import { revalidatePath } from 'next/cache';
import { USER_ROLES } from '@/lib/constants';
import { getProjectById } from '@/services/project-service'; // Proje servisinden otel bilgisini almak için

interface UpdateActivityResult {
  success: boolean;
  message: string;
  updatedCount?: number;
  processedCount?: number;
}

async function checkAdminPrivilegesForAction(idToken?: string | null): Promise<boolean> {
  if (!idToken) {
    console.warn("[CMS Action - checkAdminPrivilegesForAction] No ID token provided. Access denied.");
    return false;
  }
  try {
    console.log("[CMS Action - checkAdminPrivilegesForAction] Verifying ID token...");
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(`[CMS Action - checkAdminPrivilegesForAction] ID Token for UID ${decodedToken.uid} verified. Fetching roles...`);
    
    const roles = await getUserRoles(decodedToken.uid);
    
    // Loglamayı detaylandıralım
    console.log(`[CMS Action - checkAdminPrivilegesForAction] Fetched roles for UID ${decodedToken.uid}:`, JSON.stringify(roles));
    console.log(`[CMS Action - checkAdminPrivilegesForAction] Expected Admin role constant: '${USER_ROLES.ADMIN}'`);

    if (roles && Array.isArray(roles)) {
      if (roles.includes(USER_ROLES.ADMIN)) {
        console.log(`[CMS Action - checkAdminPrivilegesForAction] User ${decodedToken.uid} IS an Admin. Roles: ${JSON.stringify(roles)}. Access GRANTED.`);
        return true;
      } else {
        console.warn(`[CMS Action - checkAdminPrivilegesForAction] User ${decodedToken.uid} is NOT an Admin. Actual roles: ${JSON.stringify(roles)}. Expected: "${USER_ROLES.ADMIN}". Access DENIED.`);
        return false;
      }
    } else {
      console.warn(`[CMS Action - checkAdminPrivilegesForAction] User ${decodedToken.uid} has no roles array or roles are null. Fetched roles: ${JSON.stringify(roles)}. Access DENIED.`);
      return false;
    }
  } catch (error: unknown) {
    let errorMessage = "Bilinmeyen bir hata oluştu";
    let errorCode = undefined;
    if (error instanceof Error) {
        errorMessage = error.message;
        if ('code' in error) {
            errorCode = (error as { code?: string }).code;
        }
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    console.error("[CMS Action - checkAdminPrivilegesForAction] Error during privilege check:", errorMessage, errorCode ? `(Code: ${errorCode})` : '');
    return false;
  }
}


export async function handleUpdateActivitiesWithHotelInfoAction(
  prevState: UpdateActivityResult | undefined,
  formData: FormData
): Promise<UpdateActivityResult> {
  const idToken = formData.get('idToken') as string | null;

  const isAdmin = await checkAdminPrivilegesForAction(idToken);
  if (!isAdmin) {
    return { success: false, message: "Bu işlemi yalnızca Admin rolüne sahip kullanıcılar gerçekleştirebilir." };
  }

  console.log("[CMS Action] Starting updateActivitiesWithHotelInfoAction (Admin authorized)...");
  const db = admin.firestore();
  let updatedCount = 0;
  let processedCount = 0;

  try {
    const activitiesSnapshot = await db.collection("projectActivities").get();
    processedCount = activitiesSnapshot.size;

    if (activitiesSnapshot.empty) {
      return { success: true, message: "Güncellenecek proje aktivitesi bulunamadı.", updatedCount: 0, processedCount };
    }

    const batchSize = 200; 
    let batch = db.batch();
    let operationsInBatch = 0;

    for (const activityDoc of activitiesSnapshot.docs) {
      const activityData = activityDoc.data();

      if (
        (activityData.hotel === undefined || activityData.hotel === null) &&
        activityData.projectId
      ) {
        try {
          // Projeden otel bilgisini al
          const projectDetails = await getProjectById(activityData.projectId);
          
          if (projectDetails && projectDetails.hotel) {
            console.log(`[CMS Action] Updating activity ${activityDoc.id} with hotel: ${projectDetails.hotel}`);
            batch.update(activityDoc.ref, { hotel: projectDetails.hotel });
            updatedCount++;
            operationsInBatch++;

            if (operationsInBatch >= batchSize) {
              console.log(`[CMS Action] Committing batch of ${operationsInBatch} updates...`);
              await batch.commit();
              batch = db.batch(); 
              operationsInBatch = 0;
            }
          } else if (projectDetails) {
            console.warn(
              `[CMS Action] Project ${activityData.projectId} for activity ${activityDoc.id} found, but has no hotel field.`
            );
          } else {
             console.warn(
              `[CMS Action] Project ${activityData.projectId} for activity ${activityDoc.id} not found.`
            );
          }
        } catch (error: unknown) {
          let individualErrorMessage = "Bilinmeyen bir hata oluştu";
            if (error instanceof Error) {
                individualErrorMessage = error.message;
            } else if (typeof error === 'string') {
                individualErrorMessage = error;
            }
          console.error(
            `[CMS Action] Error processing individual activity ${activityDoc.id} (fetching project or updating):`,
            individualErrorMessage
          );
        }
      }
    }

    if (operationsInBatch > 0) {
      console.log(`[CMS Action] Committing final batch of ${operationsInBatch} updates...`);
      await batch.commit();
    }

    const message = `İşlem tamamlandı. Toplam ${processedCount} aktivite işlendi. ${updatedCount} aktivite otel bilgisiyle güncellendi.`;
    console.log(`[CMS Action] ${message}`);
    revalidatePath('/detailed-reports'); // Aktiviteler güncellendiği için raporlar sayfasını revalidate et
    revalidatePath('/projects'); // Etkilenen proje detay sayfalarını da revalidate etmek iyi olabilir.
    return { success: true, message, updatedCount, processedCount };

  } catch (error: unknown) {
    let generalErrorMessage = "Bilinmeyen bir hata oluştu";
    if (error instanceof Error) {
        generalErrorMessage = error.message;
    } else if (typeof error === 'string') {
        generalErrorMessage = error;
    }
    console.error("[CMS Action] Error in updateActivitiesWithHotelInfoAction:", generalErrorMessage);
    return { success: false, message: `Aktiviteler güncellenirken bir sunucu hatası oluştu: ${generalErrorMessage}` };
  }
}

