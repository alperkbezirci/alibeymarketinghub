
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
  projectName: string;
  responsiblePersons?: string[]; // Array of user UIDs
  startDate?: string; // Changed to string
  endDate: string;   // Changed to string
  status: string;
  hotel: string;
  description?: string;
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
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

export async function getProjects(): Promise<Project[]> {
  try {
    const projectsCollection = collection(db, PROJECTS_COLLECTION);
    const q = query(projectsCollection, orderBy('createdAt', 'desc'));
    const projectSnapshot = await getDocs(q);
    const projectList = projectSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        projectName: data.projectName,
        responsiblePersons: Array.isArray(data.responsiblePersons) ? data.responsiblePersons : [],
        startDate: convertToISOString(data.startDate),
        endDate: convertToISOString(data.endDate)!, // endDate is mandatory
        status: data.status,
        hotel: data.hotel,
        description: data.description,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Project;
    });
    return projectList;
  } catch (error) {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), dataToSave);

    // For the return value, we'll construct it to match the Project interface (string dates)
    // A full re-fetch (await getDoc(docRef)) would be more accurate for server-generated timestamps
    return {
      id: docRef.id,
      projectName: projectData.projectName,
      responsiblePersons: projectData.responsiblePersons || [],
      startDate: projectData.startDate?.toISOString(),
      endDate: projectData.endDate.toISOString(),
      status: projectData.status,
      hotel: projectData.hotel,
      description: projectData.description,
      createdAt: new Date().toISOString(), // Approximation, server value is set
      updatedAt: new Date().toISOString(), // Approximation
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
