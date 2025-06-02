
// src/services/task-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing tasks.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

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
  project?: string; // Could be a reference to a project ID or name
  hotel: string;
  status: string;
  priority: string;
  dueDate: string; // Changed to string
  assignedTo?: string; // Could be a user ID or name
  description?: string;
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
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
        taskName: data.taskName,
        project: data.project,
        hotel: data.hotel,
        status: data.status,
        priority: data.priority,
        dueDate: convertToISOString(data.dueDate)!, // dueDate is mandatory
        assignedTo: data.assignedTo,
        description: data.description,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Task;
    });
    return taskList;
  } catch (error) {
    console.error("Error fetching tasks: ", error);
    throw new Error("Görevler alınırken bir hata oluştu.");
  }
}

export async function addTask(taskData: TaskInputData): Promise<Task> {
  try {
    const dataToSave = {
      ...taskData,
      dueDate: Timestamp.fromDate(taskData.dueDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), dataToSave);
    
    return { 
      id: docRef.id, 
      taskName: taskData.taskName,
      project: taskData.project,
      hotel: taskData.hotel,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: taskData.dueDate.toISOString(),
      assignedTo: taskData.assignedTo,
      description: taskData.description,
      createdAt: new Date().toISOString(), // Approximation
      updatedAt: new Date().toISOString(), // Approximation
    };
  } catch (error) {
    console.error("Error adding task: ", error);
    throw new Error("Görev eklenirken bir hata oluştu.");
  }
}

// updateTask and deleteTask can be added similarly
