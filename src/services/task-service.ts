
// src/services/task-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing tasks.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, where, getDoc as getFirestoreDoc } from 'firebase/firestore';

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
  } catch (error: any) {
    console.error("[SERVICE_ERROR] Original error in getTasks:", error);
    throw new Error("Görevler alınırken bir hata oluştu. Detaylar için sunucu konsolunu kontrol edin.");
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
      const taskName = data.taskName || 'İsimsiz Görev';
      const hotel = data.hotel || 'Otel Belirtilmemiş';
      const status = data.status || 'Durum Belirtilmemiş';
      const priority = data.priority || 'Orta';
      
      const dueDateString = convertToISOString(data.dueDate);
      if (!dueDateString) {
        console.warn(`Task with ID ${docSnap.id} for project ${projectId} has a missing or invalid dueDate. Firestore data:`, data.dueDate);
      }

      return {
        id: docSnap.id,
        taskName: taskName,
        project: data.project, 
        hotel: hotel,
        status: status,
        priority: priority,
        dueDate: dueDateString!, 
        assignedTo: data.assignedTo,
        description: data.description,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Task;
    });
    return taskList;
  } catch (error: any) {
    console.error(`[SERVICE_ERROR] Original error in getTasksByProjectId for project ID ${projectId}:`, error);
    let detailedMessage = `Projeye ait görevler alınırken bir hata oluştu (Proje ID: ${projectId}).`;
    // Firestore index error codes can vary slightly or be general 'failed-precondition'
    if (error.message && (error.message.includes("FIRESTORE_INDEX_NOT_FOUND") || error.message.toLowerCase().includes("index required") || error.message.toLowerCase().includes("ensure an index"))) {
        detailedMessage += " Bu genellikle Firestore'da gerekli bir index'in eksik olmasından kaynaklanır. Lütfen tarayıcı konsolundaki Firestore hata mesajını kontrol edin; orada index oluşturma linki olabilir.";
    } else if (error.code && error.code === "failed-precondition") {
        detailedMessage += " Bu hata genellikle Firestore'da gerekli bir index'in eksik olmasından kaynaklanır. Lütfen tarayıcı konsolundaki '[SERVICE_ERROR]' ile başlayan orijinal hata mesajını kontrol edin; orada index oluşturma linki olabilir.";
    } else {
        detailedMessage += " Lütfen daha fazla bilgi için tarayıcı veya sunucu konsolundaki '[SERVICE_ERROR]' ile başlayan orijinal hata mesajını kontrol edin.";
    }
    throw new Error(detailedMessage);
  }
}


export async function addTask(taskData: TaskInputData): Promise<Task> {
  try {
    const dataToSave: { [key: string]: any } = { // Use a more generic type for dataToSave
      taskName: taskData.taskName,
      project: taskData.project || '', 
      hotel: taskData.hotel,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: Timestamp.fromDate(taskData.dueDate), 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (taskData.assignedTo !== undefined) { // Only add if defined, allows empty string
      dataToSave.assignedTo = taskData.assignedTo;
    }
    if (taskData.description !== undefined) { // Only add if defined, allows empty string
      dataToSave.description = taskData.description;
    }

    const docRef = await addDoc(collection(db, TASKS_COLLECTION), dataToSave);
    
    const newDocSnap = await getFirestoreDoc(doc(db, TASKS_COLLECTION, docRef.id));
    const newData = newDocSnap.data();

    return { 
      id: docRef.id, 
      taskName: taskData.taskName,
      project: taskData.project || '',
      hotel: taskData.hotel,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: taskData.dueDate.toISOString(), 
      assignedTo: taskData.assignedTo,
      description: taskData.description,
      createdAt: convertToISOString(newData?.createdAt) || new Date().toISOString(), 
      updatedAt: convertToISOString(newData?.updatedAt) || new Date().toISOString(), 
    };
  } catch (error: any) {
    console.error(`[SERVICE_ERROR] Original error in addTask:`, error);
    throw new Error("Görev eklenirken bir hata oluştu. Detaylar için konsolu kontrol edin.");
  }
}
