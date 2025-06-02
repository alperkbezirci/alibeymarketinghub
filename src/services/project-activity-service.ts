
// src/services/project-activity-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing project activities (comments, file uploads, status changes).
 */
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore';
import type { User } from '@/contexts/auth-context'; // For user info

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

export type ProjectActivityType = 'comment' | 'file_upload' | 'status_update';
export type ProjectActivityStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'information';

export interface ProjectActivity {
  id: string;
  projectId: string;
  userId: string;
  userName: string; // Denormalized for easier display
  userPhotoURL?: string; // Denormalized
  type: ProjectActivityType;
  content?: string; // For comments or messages
  fileName?: string;
  fileType?: string; // e.g., 'image/png', 'application/pdf'
  // fileURL will be added once actual file storage is implemented
  newStatus?: string; // For status_update type
  previousStatus?: string; // For status_update type
  status: ProjectActivityStatus; // For the activity itself (e.g., comment awaiting approval)
  messageForManager?: string;
  createdAt: string; // ISO string
}

export interface ProjectActivityInputData {
  projectId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  type: ProjectActivityType;
  content?: string;
  fileName?: string;
  fileType?: string;
  newStatus?: string;
  previousStatus?: string;
  status: ProjectActivityStatus; // Initial status (e.g., 'draft' or 'information')
  messageForManager?: string;
}

const PROJECT_ACTIVITIES_COLLECTION = 'projectActivities';

export async function addProjectActivity(activityData: ProjectActivityInputData): Promise<ProjectActivity> {
  try {
    const dataToSave = {
      ...activityData,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, PROJECT_ACTIVITIES_COLLECTION), dataToSave);
    
    // For consistency, we should ideally fetch the document to get the server timestamp
    // but for now, we'll approximate or rely on client-side re-fetch.
    return {
      id: docRef.id,
      ...activityData,
      createdAt: new Date().toISOString(), // Approximation
    };
  } catch (error) {
    console.error("Error adding project activity: ", error);
    throw new Error("Proje aktivitesi eklenirken bir hata oluştu.");
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
        newStatus: data.newStatus,
        previousStatus: data.previousStatus,
        status: data.status as ProjectActivityStatus,
        messageForManager: data.messageForManager,
        createdAt: convertToISOString(data.createdAt)!, // createdAt should always exist
      } as ProjectActivity;
    });
    return activityList;
  } catch (error) {
    console.error(`Error fetching activities for project ID ${projectId}: `, error);
    throw new Error(`Projeye ait aktiviteler alınırken bir hata oluştu (Proje ID: ${projectId}).`);
  }
}

export async function updateProjectActivity(activityId: string, updates: Partial<Omit<ProjectActivity, 'id' | 'projectId' | 'userId' | 'userName' | 'createdAt'>>): Promise<void> {
  try {
    const activityDoc = doc(db, PROJECT_ACTIVITIES_COLLECTION, activityId);
    await updateDoc(activityDoc, updates);
  } catch (error) {
    console.error(`Error updating project activity ${activityId}: `, error);
    throw new Error(`Proje aktivitesi (${activityId}) güncellenirken bir hata oluştu.`);
  }
}
