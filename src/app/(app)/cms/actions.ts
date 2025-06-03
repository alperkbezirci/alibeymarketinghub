
// src/app/(app)/cms/actions.ts
"use server";

import { admin } from '@/lib/firebase-admin';
import { getUserRoles } from '@/services/user-service'; // Assuming this can be called server-side
import { revalidatePath } from 'next/cache';
import { USER_ROLES } from '@/lib/constants';

interface UpdateActivityResult {
  success: boolean;
  message: string;
  updatedCount?: number;
  processedCount?: number;
}

async function checkAdminPrivilegesForAction(idToken?: string | null): Promise<boolean> {
  if (!idToken) {
    console.warn("[CMS Action - checkAdminPrivilegesForAction] No ID token provided.");
    return false;
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // Firestore'dan kullanıcının rollerini çek
    const roles = await getUserRoles(decodedToken.uid); // Bu fonksiyonun sunucuda çalışabilir olması lazım.
                                                      // Veya custom claims kullanılıyorsa: const roles = decodedToken.roles as string[];
    if (roles && roles.includes(USER_ROLES.ADMIN)) {
      return true;
    }
    console.warn(`[CMS Action - checkAdminPrivilegesForAction] User ${decodedToken.uid} is not an Admin. Roles: ${roles}`);
    return false;
  } catch (error: any) {
    console.error("[CMS Action - checkAdminPrivilegesForAction] Error verifying ID token or fetching roles:", error.message);
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

  console.log("[CMS Action] Starting updateActivitiesWithHotelInfoAction...");
  const db = admin.firestore();
  let updatedCount = 0;
  let processedCount = 0;

  try {
    const activitiesSnapshot = await db.collection("projectActivities").get();
    processedCount = activitiesSnapshot.size;

    if (activitiesSnapshot.empty) {
      return { success: true, message: "Güncellenecek proje aktivitesi bulunamadı.", updatedCount: 0, processedCount };
    }

    const batchSize = 200; // Firestore batch write limiti 500'dür
    let batch = db.batch();
    let operationsInBatch = 0;

    for (const activityDoc of activitiesSnapshot.docs) {
      const activityData = activityDoc.data();

      if (
        (activityData.hotel === undefined || activityData.hotel === null) &&
        activityData.projectId
      ) {
        try {
          const projectRef = db
            .collection("projects")
            .doc(activityData.projectId);
          const projectSnap = await projectRef.get();

          if (projectSnap.exists()) {
            const projectData = projectSnap.data();
            if (projectData && projectData.hotel) {
              console.log(`[CMS Action] Updating activity ${activityDoc.id} with hotel: ${projectData.hotel}`);
              batch.update(activityDoc.ref, { hotel: projectData.hotel });
              updatedCount++;
              operationsInBatch++;

              if (operationsInBatch >= batchSize) {
                console.log(`[CMS Action] Committing batch of ${operationsInBatch} updates...`);
                await batch.commit();
                batch = db.batch(); // Yeni bir batch başlat
                operationsInBatch = 0;
              }
            } else {
              console.warn(
                `[CMS Action] Project ${activityData.projectId} for activity ${activityDoc.id} found, but has no hotel field.`
              );
            }
          } else {
            console.warn(
              `[CMS Action] Project ${activityData.projectId} for activity ${activityDoc.id} not found.`
            );
          }
        } catch (error: any) {
          console.error(
            `[CMS Action] Error processing individual activity ${activityDoc.id}:`,
            error.message
          );
          // Tek bir aktivitede hata olursa logla ve devam et
        }
      }
    }

    if (operationsInBatch > 0) {
      console.log(`[CMS Action] Committing final batch of ${operationsInBatch} updates...`);
      await batch.commit();
    }

    const message = `İşlem tamamlandı. Toplam ${processedCount} aktivite işlendi. ${updatedCount} aktivite otel bilgisiyle güncellendi.`;
    console.log(`[CMS Action] ${message}`);
    revalidatePath('/detailed-reports'); // Raporlar sayfasını yenilemek için
    return { success: true, message, updatedCount, processedCount };

  } catch (error: any) {
    console.error("[CMS Action] Error in updateActivitiesWithHotelInfoAction:", error.message);
    return { success: false, message: `Aktiviteler güncellenirken bir sunucu hatası oluştu: ${error.message}` };
  }
}
