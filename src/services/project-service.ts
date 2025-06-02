
// src/services/project-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing projects.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface Project {
  id: string; // Firestore document ID
  projectName: string;
  responsiblePersons?: string[]; // Array of user UIDs
  startDate?: Timestamp | string | Date;
  endDate: Timestamp | string | Date;
  status: string;
  hotel: string;
  description?: string;
  // files?: any[]; // Placeholder for file metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
        ...data,
        responsiblePersons: Array.isArray(data.responsiblePersons) ? data.responsiblePersons : [], // Ensure it's an array
        startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : data.endDate,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      } as Project;
    });
    return projectList;
  } catch (error) {
    console.error("Error fetching projects: ", error);
    throw new Error("Projeler alınırken bir hata oluştu.");
  }
}

export async function addProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  try {
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), {
      ...projectData,
      responsiblePersons: projectData.responsiblePersons || [], // Ensure it's an array, even if empty
      startDate: projectData.startDate ? Timestamp.fromDate(new Date(projectData.startDate as string | Date)) : null,
      endDate: Timestamp.fromDate(new Date(projectData.endDate as string | Date)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      id: docRef.id,
      ...projectData,
      responsiblePersons: projectData.responsiblePersons || [],
      createdAt: Timestamp.now() // Approximate
    } as Project;
  } catch (error) {
    console.error("Error adding project: ", error);
    throw new Error("Proje eklenirken bir hata oluştu.");
  }
}

export async function updateProject(id: string, projectData: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  try {
    const projectDoc = doc(db, PROJECTS_COLLECTION, id);
    const updateData: any = { ...projectData, updatedAt: serverTimestamp() };
    if (projectData.startDate) {
      updateData.startDate = Timestamp.fromDate(new Date(projectData.startDate as string | Date));
    }
    if (projectData.endDate) {
      updateData.endDate = Timestamp.fromDate(new Date(projectData.endDate as string | Date));
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
