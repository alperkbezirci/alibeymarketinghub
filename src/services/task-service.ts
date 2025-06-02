
// src/services/task-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing tasks.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, where } from 'firebase/firestore';

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

export interface Task {
  id: string; // Firestore document ID
  taskName: string;
  project?: string; // Project ID
  hotel: string;
  status: string;
  priority: string;
  dueDate: string; // ISO string
  assignedTo?: string; // User ID or name
  description?: string;
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface TaskInputData {
  taskName: string;
  project?: string;
  hotel: string;
  status: string;
  priority: string;
  dueDate: Date; // Expect Date from form
  assignedTo?: string;
  description?: string;
}

const TASKS_COLLECTION = 'tasks';

export async function getTasks(): Promise<Task[]> {
  try {
    const tasksCollection = collection(db, TASKS_COLLECTION);
    const q = query(tasksCollection, orderBy('createdAt', 'desc'));
    const taskSnapshot = await getDocs(q);
    const taskList = taskSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        taskName: data.taskName || 'İsimsiz Görev',
        project: data.project || '',
        hotel: data.hotel || 'Bilinmiyor',
        status: data.status || 'Bilinmiyor',
        priority: data.priority || 'Orta',
        dueDate: convertToISOString(data.dueDate)!, // dueDate is mandatory
        assignedTo: data.assignedTo,
        description: data.description,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Task;
    });
    return taskList;
  } catch (error) {
    console.error("Original error in getTasks:", error);
    throw new Error("Görevler alınırken bir hata oluştu.");
  }
}

export async function getTasksByProjectId(projectId: string): Promise<Task[]> {
  if (!projectId) return [];
  try {
    const tasksCollection = collection(db, TASKS_COLLECTION);
    const q = query(tasksCollection, where('project', '==', projectId), orderBy('dueDate', 'asc'));
    const taskSnapshot = await getDocs(q);
    const taskList = taskSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        taskName: data.taskName || 'İsimsiz Görev',
        project: data.project, // Should be projectId
        hotel: data.hotel || 'Bilinmiyor',
        status: data.status || 'Bilinmiyor',
        priority: data.priority || 'Orta',
        dueDate: convertToISOString(data.dueDate)!,
        assignedTo: data.assignedTo,
        description: data.description,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Task;
    });
    return taskList;
  } catch (error) {
    console.error(`Error fetching tasks for project ID ${projectId}: `, error);
    throw new Error(`Projeye ait görevler alınırken bir hata oluştu (Proje ID: ${projectId}).`);
  }
}


export async function addTask(taskData: TaskInputData): Promise<Task> {
  try {
    const dataToSave = {
      ...taskData,
      project: taskData.project || '', // Ensure project is not undefined
      dueDate: Timestamp.fromDate(taskData.dueDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), dataToSave);
    
    // Fetch the just added document to get server-generated timestamps
    const newDocSnap = await doc(db, TASKS_COLLECTION, docRef.id).get();
    const newData = newDocSnap.data();

    return { 
      id: docRef.id, 
      taskName: taskData.taskName,
      project: taskData.project || '',
      hotel: taskData.hotel,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: taskData.dueDate.toISOString(), // Use input date for immediate consistency
      assignedTo: taskData.assignedTo,
      description: taskData.description,
      createdAt: convertToISOString(newData?.createdAt) || new Date().toISOString(),
      updatedAt: convertToISOString(newData?.updatedAt) || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error adding task: ", error);
    throw new Error("Görev eklenirken bir hata oluştu.");
  }
}

// updateTask and deleteTask can be added similarly
// export async function updateTask(id: string, taskData: Partial<TaskInputData>): Promise<void> { ... }
// export async function deleteTask(id: string): Promise<void> { ... }
