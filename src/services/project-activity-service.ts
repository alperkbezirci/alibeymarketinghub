
// src/services/project-activity-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing project activities (comments, file uploads, status changes).
 * Firestore Rules Reminder for 'projectActivities' collection:
 * Ensure that authenticated users have permission to:
 * - read activities (e.g., allow read: if request.auth != null;)
 * - create activities, matching their userId (e.g., allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;)
 * - update their own draft activities (e.g., allow update: if request.auth != null && request.auth.uid == resource.data.userId && resource.data.status == 'draft';)
 * Marketing Managers/Admins might need broader update permissions for changing status from 'pending_approval' to 'approved'/'rejected'.
 */
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, doc, updateDoc, limit as firestoreLimit } from 'firebase/firestore';

// Helper to safely convert Firestore Timestamps or Dates to ISO strings
const convertToISOString = (dateField: any): string | undefined => {
  if (!dateField) return undefined;
  if (dateField instanceof Timestamp) return dateField.toDate().toISOString();
  if (dateField instanceof Date) return dateField.toISOString();
  try {
    return new Date(dateField).toISOString();
  } catch (e) {
    console.warn("Could not convert date field to ISO string:", dateField);
    return typeof dateField === 'string' ? dateField : undefined;
  }
};

export type ProjectActivityType = 'comment' | 'file_upload' | 'status_update'; // 'status_update' can be used for approval log later
export type ProjectActivityStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'information';

export interface ProjectActivity {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  type: ProjectActivityType;
  content?: string;
  fileName?: string;
  fileType?: string;
  status: ProjectActivityStatus;
  messageForManager?: string; // Message from user when sending for approval
  managerFeedback?: string; // Feedback from manager when approving/rejecting
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string for status changes or edits
}

export interface ProjectActivityInputData {
  projectId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  type: ProjectActivityType;
  status: ProjectActivityStatus; // Action will determine this
  content?: string;
  fileName?: string;
  fileType?: string;
  // messageForManager is handled in update, not initial creation via this direct service input
}

const PROJECT_ACTIVITIES_COLLECTION = 'projectActivities';

export async function addProjectActivity(activityData: ProjectActivityInputData): Promise<ProjectActivity> {
  try {
    const dataToSave: any = {
      projectId: activityData.projectId,
      userId: activityData.userId,
      userName: activityData.userName,
      type: activityData.type,
      status: activityData.status, // Status is now set by the action
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(), // Initialize updatedAt
    };

    if (activityData.userPhotoURL) dataToSave.userPhotoURL = activityData.userPhotoURL;
    if (activityData.content) dataToSave.content = activityData.content;
    if (activityData.fileName) dataToSave.fileName = activityData.fileName;
    if (activityData.fileType) dataToSave.fileType = activityData.fileType;
    
    const docRef = await addDoc(collection(db, PROJECT_ACTIVITIES_COLLECTION), dataToSave);
    
    return {
      id: docRef.id,
      ...activityData, // original data passed, status will be from action
      createdAt: new Date().toISOString(), // Approximation
      updatedAt: new Date().toISOString(), // Approximation
    };
  } catch (error: any) {
    console.error("[SERVICE_ERROR] Original error in addProjectActivity:", error);
    // Log the full error object for more details, especially for Firebase errors
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw new Error(`Proje aktivitesi eklenirken bir hata oluştu: ${error.message || 'Bilinmeyen sunucu hatası'}. Lütfen konsolu kontrol edin.`);
  }
}

export async function getProjectActivities(projectId: string): Promise<ProjectActivity[]> {
  if (!projectId) return [];
  try {
    const activitiesCollection = collection(db, PROJECT_ACTIVITIES_COLLECTION);
    const q = query(activitiesCollection, where('projectId', '==', projectId), orderBy('createdAt', 'desc'));
    const activitySnapshot = await getDocs(q);
    const activityList = activitySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        projectId: data.projectId,
        userId: data.userId,
        userName: data.userName,
        userPhotoURL: data.userPhotoURL,
        type: data.type as ProjectActivityType,
        content: data.content,
        fileName: data.fileName,
        fileType: data.fileType,
        status: data.status as ProjectActivityStatus,
        messageForManager: data.messageForManager,
        managerFeedback: data.managerFeedback,
        createdAt: convertToISOString(data.createdAt)!, 
        updatedAt: convertToISOString(data.updatedAt),
      } as ProjectActivity;
    });
    return activityList;
  } catch (error:any) {
    console.error(`[SERVICE_ERROR] Original error fetching activities for project ID ${projectId}: `, error);
    let detailedMessage = `Projeye ait aktiviteler alınırken bir hata oluştu (Proje ID: ${projectId}). `;
    if (error.code === "failed-precondition" || (error.message && error.message.toLowerCase().includes("index required"))) {
        detailedMessage += "Bu, genellikle Firestore'da eksik bir veritabanı indeksi anlamına gelir. Lütfen tarayıcı konsolundaki orijinal hata mesajını kontrol edin; orada indeksi oluşturmak için bir bağlantı olabilir.";
    } else {
        detailedMessage += "Daha fazla bilgi için tarayıcı konsolunu kontrol edin.";
    }
    throw new Error(detailedMessage);
  }
}

export async function updateProjectActivity(activityId: string, updates: Partial<Omit<ProjectActivity, 'id' | 'projectId' | 'userId' | 'userName' | 'createdAt'>>): Promise<void> {
  try {
    const activityDoc = doc(db, PROJECT_ACTIVITIES_COLLECTION, activityId);
    await updateDoc(activityDoc, { ...updates, updatedAt: serverTimestamp() });
  } catch (error: any) {
    console.error(`[SERVICE_ERROR] Error updating project activity ${activityId}: `, error);
    throw new Error(`Proje aktivitesi (${activityId}) güncellenirken bir hata oluştu: ${error.message || 'Bilinmeyen sunucu hatası'}`);
  }
}

export async function getPendingApprovalActivities(limitCount: number = 5): Promise<ProjectActivity[]> {
  try {
    const activitiesCollection = collection(db, PROJECT_ACTIVITIES_COLLECTION);
    const q = query(
      activitiesCollection,
      where('status', '==', 'pending_approval'),
      orderBy('createdAt', 'desc'), // Show most recent pending approvals first
      firestoreLimit(limitCount)
    );
    const activitySnapshot = await getDocs(q);
    const activityList = activitySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        projectId: data.projectId,
        userId: data.userId,
        userName: data.userName,
        userPhotoURL: data.userPhotoURL,
        type: data.type as ProjectActivityType,
        content: data.content,
        fileName: data.fileName,
        fileType: data.fileType,
        status: data.status as ProjectActivityStatus,
        messageForManager: data.messageForManager,
        managerFeedback: data.managerFeedback,
        createdAt: convertToISOString(data.createdAt)!,
        updatedAt: convertToISOString(data.updatedAt),
      } as ProjectActivity;
    });
    return activityList;
  } catch (error: any) {
    console.error("Error fetching pending approval activities: ", error);
    let userMessage = "Onay bekleyen aktiviteler alınırken bir hata oluştu.";
     if (error.code === 'failed-precondition' && error.message?.includes('index')) {
        userMessage += " Lütfen Firestore için gerekli index'in oluşturulduğundan emin olun. Hata mesajında index oluşturma linki olabilir.";
    }
    throw new Error(userMessage);
  }
}
