
// src/services/task-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing tasks.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface Task {
  id: string; // Firestore document ID
  taskName: string;
  project?: string; // Could be a reference to a project ID or name
  hotel: string;
  status: string;
  priority: string;
  dueDate: Timestamp | string | Date;
  assignedTo?: string; // Could be a user ID or name
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
        ...data,
        dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : data.dueDate,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      } as Task;
    });
    return taskList;
  } catch (error) {
    console.error("Error fetching tasks: ", error);
    throw new Error("Görevler alınırken bir hata oluştu.");
  }
}

export async function addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  try {
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
      ...taskData,
      dueDate: Timestamp.fromDate(new Date(taskData.dueDate as string | Date)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { 
      id: docRef.id, 
      ...taskData, 
      createdAt: Timestamp.now() // Approximate
    } as Task;
  } catch (error) {
    console.error("Error adding task: ", error);
    throw new Error("Görev eklenirken bir hata oluştu.");
  }
}

// updateTask and deleteTask can be added similarly
