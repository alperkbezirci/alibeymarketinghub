
// src/services/project-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing projects.
 */
import { db } from '@/lib/firebase';
import { admin } from '@/lib/firebase-admin'; // For storage delete
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, getDoc as getFirestoreDoc, where, limit as firestoreLimit } from 'firebase/firestore';

const STORAGE_BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'alibey-marketing-hub.appspot.com';

const convertToISOString = (dateField: Timestamp | Date | string | undefined | null): string | undefined => {
  if (dateField === undefined || dateField === null) return undefined;
  if (dateField instanceof Timestamp) return dateField.toDate().toISOString();
  if (dateField instanceof Date) return dateField.toISOString();
  try {
    return new Date(dateField).toISOString();
  } catch (e) {
    console.warn("Could not convert date field to ISO string:", dateField);
    return typeof dateField === 'string' ? dateField : undefined;
  }
};

export interface Project {
  id: string;
  projectName?: string;
  responsiblePersons?: string[];
  startDate?: string | undefined;
  endDate?: string | undefined;
  status?: string;
  hotel?: string;
  description?: string;
  projectFileURL?: string; // URL to access the main project file
  projectStoragePath?: string; // Path in Firebase Storage for the main project file
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

// Data expected by the service for adding/updating, file URL and path are strings here
export interface ProjectInputDataForService {
  projectName: string;
  responsiblePersons?: string[];
  startDate?: Date;
  endDate: Date;
  status: string;
  hotel: string;
  description?: string;
  projectFileURL?: string;
  projectStoragePath?: string;
}

// Data coming from the form, which might include a File object
export interface ProjectFormData extends Omit<ProjectInputDataForService, 'projectFileURL' | 'projectStoragePath' | 'startDate' | 'endDate' > {
  startDate?: Date;
  endDate: Date;
  projectFile?: File | null;
}


const PROJECTS_COLLECTION = 'projects';

export async function getProjects(): Promise<Project[]> {
  try {
    const projectsCollection = collection(db, PROJECTS_COLLECTION);
    const q = query(projectsCollection, orderBy('createdAt', 'desc'));
    const projectSnapshot = await getDocs(q);
    const projectList = projectSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        projectName: data.projectName || 'İsimsiz Proje',
        responsiblePersons: Array.isArray(data.responsiblePersons) ? data.responsiblePersons : [],
        startDate: convertToISOString(data.startDate),
        endDate: convertToISOString(data.endDate),
        status: data.status || 'Bilinmiyor',
        hotel: data.hotel || 'Bilinmiyor',
        description: data.description,
        projectFileURL: data.projectFileURL,
        projectStoragePath: data.projectStoragePath,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Project;
    });
    return projectList;
  } catch (error) {
    console.error("Original error in getProjects:", error);
    throw new Error("Projeler alınırken bir hata oluştu.");
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const projectDocRef = doc(db, PROJECTS_COLLECTION, id);
    const docSnap = await getFirestoreDoc(projectDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        projectName: data.projectName || 'İsimsiz Proje',
        responsiblePersons: Array.isArray(data.responsiblePersons) ? data.responsiblePersons : [],
        startDate: convertToISOString(data.startDate),
        endDate: convertToISOString(data.endDate),
        status: data.status || 'Bilinmiyor',
        hotel: data.hotel || 'Bilinmiyor',
        description: data.description,
        projectFileURL: data.projectFileURL,
        projectStoragePath: data.projectStoragePath,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Project;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching project with ID ${id}:`, error);
    throw new Error(`Proje (ID: ${id}) alınırken bir hata oluştu.`);
  }
}

export async function getProjectsByUserId(userId: string): Promise<Project[]> {
  if (!userId) return [];
  try {
    const projectsCollection = collection(db, PROJECTS_COLLECTION);
    const q = query(
      projectsCollection,
      where('responsiblePersons', 'array-contains', userId),
      orderBy('createdAt', 'desc') 
    );
    const projectSnapshot = await getDocs(q);
    const projectList = projectSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        projectName: data.projectName || 'İsimsiz Proje',
        responsiblePersons: data.responsiblePersons || [],
        startDate: convertToISOString(data.startDate),
        endDate: convertToISOString(data.endDate),
        status: data.status || 'Bilinmiyor',
        hotel: data.hotel || 'Bilinmiyor',
        description: data.description,
        projectFileURL: data.projectFileURL,
        projectStoragePath: data.projectStoragePath,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Project;
    });
    return projectList;
  } catch (error: any) {
    console.error(`Error fetching projects for user ${userId}: `, error);
    let userMessage = `Kullanıcıya (${userId}) ait projeler alınırken bir hata oluştu.`;
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
        userMessage += " Lütfen Firestore için 'projects' koleksiyonunda 'responsiblePersons' (array-contains) ve 'createdAt' (desc) alanlarını içeren bir bileşik index oluşturduğunuzdan emin olun. Hata mesajında index oluşturma linki olabilir.";
    }
    throw new Error(userMessage);
  }
}


export async function addProject(projectData: ProjectInputDataForService): Promise<Project> {
  try {
    const dataToSave = {
      projectName: projectData.projectName,
      responsiblePersons: projectData.responsiblePersons || [],
      startDate: projectData.startDate ? Timestamp.fromDate(projectData.startDate) : null,
      endDate: Timestamp.fromDate(projectData.endDate),
      status: projectData.status,
      hotel: projectData.hotel,
      description: projectData.description || '',
      projectFileURL: projectData.projectFileURL || null,
      projectStoragePath: projectData.projectStoragePath || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), dataToSave);
    const newDocSnap = await getFirestoreDoc(doc(db, PROJECTS_COLLECTION, docRef.id));
    const savedData = newDocSnap.data();

    return {
      id: docRef.id,
      projectName: projectData.projectName,
      responsiblePersons: projectData.responsiblePersons || [],
      startDate: projectData.startDate?.toISOString(),
      endDate: projectData.endDate.toISOString(),
      status: projectData.status,
      hotel: projectData.hotel,
      description: projectData.description,
      projectFileURL: savedData?.projectFileURL,
      projectStoragePath: savedData?.projectStoragePath,
      createdAt: convertToISOString(savedData?.createdAt) || new Date().toISOString(),
      updatedAt: convertToISOString(savedData?.updatedAt) || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error adding project: ", error);
    throw new Error("Proje eklenirken bir hata oluştu.");
  }
}

// Note: Updating project file via this function is not directly supported.
// File updates typically involve deleting the old file (if name changes or file is removed)
// and uploading the new one, then updating URL/path.
// This updateProject is for other metadata.
export async function updateProject(id: string, projectData: Partial<ProjectInputDataForService>): Promise<void> {
  try {
    const projectDoc = doc(db, PROJECTS_COLLECTION, id);
    const updateData: any = { ...projectData, updatedAt: serverTimestamp() };
    if (projectData.startDate) {
      updateData.startDate = Timestamp.fromDate(new Date(projectData.startDate));
    }
    if (projectData.endDate) {
      updateData.endDate = Timestamp.fromDate(new Date(projectData.endDate));
    }
    if (projectData.responsiblePersons) {
        updateData.responsiblePersons = projectData.responsiblePersons;
    }
    // projectFileURL and projectStoragePath should be updated carefully, typically after a new upload
    if (projectData.hasOwnProperty('projectFileURL')) {
        updateData.projectFileURL = projectData.projectFileURL;
    }
    if (projectData.hasOwnProperty('projectStoragePath')) {
        updateData.projectStoragePath = projectData.projectStoragePath;
    }
    await updateDoc(projectDoc, updateData);
  } catch (error) {
    console.error("Error updating project: ", error);
    throw new Error("Proje güncellenirken bir hata oluştu.");
  }
}

export async function deleteProject(id: string): Promise<void> {
  const projectDocRef = doc(db, PROJECTS_COLLECTION, id);
  try {
    const projectSnap = await getFirestoreDoc(projectDocRef);
    if (projectSnap.exists()) {
      const projectData = projectSnap.data() as Project;
      if (projectData.projectStoragePath) {
        try {
          if (!admin.apps.length) {
            console.warn("Firebase Admin SDK not initialized. Cannot delete file from Storage for project:", id);
          } else {
            const bucket = admin.storage().bucket(STORAGE_BUCKET_NAME);
            await bucket.file(projectData.projectStoragePath).delete();
            console.log(`File ${projectData.projectStoragePath} for project ${id} deleted from Firebase Storage.`);
          }
        } catch (storageError: any) {
          console.error(`Failed to delete file ${projectData.projectStoragePath} from Storage for project ${id}:`, storageError);
          // Decide if you want to stop project deletion if file deletion fails.
        }
      }
    }
    await deleteDoc(projectDocRef);
    console.log(`Project with ID: ${id} successfully deleted from Firestore.`);
  } catch (error: any) {
    console.error("Error deleting project: ", error);
    throw new Error(`Proje (ID: ${id}) silinirken bir hata oluştu: ${error.message || 'Bilinmeyen sunucu hatası'}`);
  }
}


export async function getActiveProjects(limitCount: number = 5): Promise<Project[]> {
  try {
    const projectsCollection = collection(db, PROJECTS_COLLECTION);
    const activeStatuses = ['Planlama', 'Devam Ediyor'];
    const q = query(
      projectsCollection,
      where('status', 'in', activeStatuses),
      firestoreLimit(limitCount)
    );
    const projectSnapshot = await getDocs(q);
    const projectList = projectSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        projectName: data.projectName || 'İsimsiz Proje',
        responsiblePersons: Array.isArray(data.responsiblePersons) ? data.responsiblePersons : [],
        startDate: convertToISOString(data.startDate),
        endDate: convertToISOString(data.endDate),
        status: data.status || 'Bilinmiyor',
        hotel: data.hotel || 'Bilinmiyor',
        description: data.description,
        projectFileURL: data.projectFileURL,
        projectStoragePath: data.projectStoragePath,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Project;
    });
    return projectList;
  } catch (error: any) {
    console.error("Error fetching active projects: ", error);
    let userMessage = "Aktif projeler alınırken bir hata oluştu.";
     if (error.code === 'failed-precondition' && error.message?.includes('index')) {
        userMessage += " Lütfen Firestore için gerekli index'in oluşturulduğundan emin olun. Hata mesajında index oluşturma linki olabilir.";
    }
    throw new Error(userMessage);
  }
}

export async function getProjectCountByStatus(): Promise<{ status: string; count: number }[]> {
  try {
    const projectsCollection = collection(db, PROJECTS_COLLECTION);
    const projectSnapshot = await getDocs(projectsCollection);
    const statusCounts: { [key: string]: number } = {};

    projectSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const status = data.status || 'Bilinmiyor';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  } catch (error) {
    console.error("Error fetching project count by status: ", error);
    throw new Error("Proje sayıları durumlarına göre alınırken bir hata oluştu.");
  }
}

export async function getProjectCreationTrend(): Promise<{ month: string; count: number }[]> {
  try {
    const projectsCollection = collection(db, PROJECTS_COLLECTION);
    const q = query(projectsCollection, orderBy('createdAt', 'asc'));
    const projectSnapshot = await getDocs(q);

    const monthlyData: { [month: string]: { count: number } } = {};

    projectSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const createdAt = data.createdAt;

      if (createdAt instanceof Timestamp) {
        const createdMonth = createdAt.toDate().toISOString().substring(0, 7);
        if (!monthlyData[createdMonth]) {
          monthlyData[createdMonth] = { count: 0 };
        }
        monthlyData[createdMonth].count += 1;
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, count: data.count }))
      .sort((a,b) => a.month.localeCompare(b.month));

  } catch (error) {
    console.error("Error fetching project creation trend: ", error);
    throw new Error("Proje oluşturma trendi alınırken bir hata oluştu.");
  }
}

    