
// src/services/project-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing projects.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

// Helper to safely convert Firestore Timestamps or Dates to ISO strings
const convertToISOString = (dateField: any): string | undefined => {
  if (!dateField) return undefined;
  if (dateField instanceof Timestamp) return dateField.toDate().toISOString();
  if (dateField instanceof Date) return dateField.toISOString();
  // Attempt to parse if it's a string or number, though ideally it's already an ISO string or one of the above
  try {
    return new Date(dateField).toISOString();
  } catch (e) {
    console.warn("Could not convert date field to ISO string:", dateField);
    // Return as string if it's already a string, otherwise undefined or handle error
    return typeof dateField === 'string' ? dateField : undefined;
  }
};

export interface Project {
  id: string; // Firestore document ID
  projectName?: string; // Made optional
  responsiblePersons?: string[]; // Array of user UIDs
  startDate?: string | undefined;
  endDate?: string | undefined;
  status?: string; // Made optional
  hotel?: string; // Made optional
  description?: string;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface ProjectInputData {
  projectName: string;
  responsiblePersons?: string[];
  startDate?: Date; // Expect Date from form
  endDate: Date;   // Expect Date from form
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
        projectName: data.projectName || 'İsimsiz Proje', // Fallback for missing projectName
        responsiblePersons: Array.isArray(data.responsiblePersons) ? data.responsiblePersons : [],
        startDate: convertToISOString(data.startDate),
        endDate: convertToISOString(data.endDate),
        status: data.status || 'Bilinmiyor', // Fallback for missing status
        hotel: data.hotel || 'Bilinmiyor', // Fallback for missing hotel
        description: data.description,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Project;
    });
    return projectList;
  } catch (error) {
    console.error("Original error in getProjects:", error); // Log the original error
    console.error("Error fetching projects: ", error);
    throw new Error("Projeler alınırken bir hata oluştu.");
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
