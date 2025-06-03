
// src/services/project-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing projects.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, getDoc as getFirestoreDoc, where, limit as firestoreLimit } from 'firebase/firestore';

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

export interface Project {
  id: string;
  projectName?: string;
  responsiblePersons?: string[];
  startDate?: string | undefined;
  endDate?: string | undefined;
  status?: string;
  hotel?: string;
  description?: string;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface ProjectInputData {
  projectName: string;
  responsiblePersons?: string[];
  startDate?: Date;
  endDate: Date;
  status: string;
  hotel: string;
  description?: string;
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


export async function addProject(projectData: ProjectInputData): Promise<Project> {
  try {
    const dataToSave = {
      ...projectData,
      startDate: projectData.startDate ? Timestamp.fromDate(projectData.startDate) : null,
      endDate: Timestamp.fromDate(projectData.endDate),
      responsiblePersons: projectData.responsiblePersons || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), dataToSave);

    return {
      id: docRef.id,
      projectName: projectData.projectName,
      responsiblePersons: projectData.responsiblePersons || [],
      startDate: projectData.startDate?.toISOString(),
      endDate: projectData.endDate.toISOString(),
      status: projectData.status,
      hotel: projectData.hotel,
      description: projectData.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error adding project: ", error);
    throw new Error("Proje eklenirken bir hata oluştu.");
  }
}

export async function updateProject(id: string, projectData: Partial<ProjectInputData>): Promise<void> {
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
    await updateDoc(projectDoc, updateData);
  } catch (error) {
    console.error("Error updating project: ", error);
    throw new Error("Proje güncellenirken bir hata oluştu.");
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const projectDoc = doc(db, PROJECTS_COLLECTION, id);
    await deleteDoc(projectDoc);
  } catch (error) {
    console.error("Error deleting project: ", error);
    throw new Error("Proje silinirken bir hata oluştu.");
  }
}

export async function getActiveProjects(limitCount: number = 5): Promise<Project[]> {
  try {
    const projectsCollection = collection(db, PROJECTS_COLLECTION);
    const activeStatuses = ['Planlama', 'Devam Ediyor'];
    const q = query(
      projectsCollection,
      where('status', 'in', activeStatuses),
      // orderBy('endDate', 'asc'), // Bu satır eksik indeks hatasına neden oluyordu, kaldırıldı.
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
