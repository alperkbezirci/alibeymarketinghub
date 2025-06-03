
// src/services/task-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing tasks.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, where, getDoc as getFirestoreDoc, limit as firestoreLimit } from 'firebase/firestore';

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
  dueDate?: string | undefined; // ISO string, made optional
  assignedTo?: string[]; // Array of user UIDs or names - CHANGED TO string[]
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
  assignedTo?: string[]; // CHANGED TO string[]
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
        dueDate: convertToISOString(data.dueDate),
        assignedTo: Array.isArray(data.assignedTo) ? data.assignedTo : (data.assignedTo ? [data.assignedTo] : []),
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

      return {
        id: docSnap.id,
        taskName: taskName,
        project: data.project, 
        hotel: hotel,
        status: status,
        priority: priority,
        dueDate: dueDateString, 
        assignedTo: Array.isArray(data.assignedTo) ? data.assignedTo : (data.assignedTo ? [data.assignedTo] : []),
        description: data.description,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Task;
    });
    return taskList;
  } catch (error: any) {
    console.error(`[SERVICE_ERROR] Original Firestore error in getTasksByProjectId for project ID ${projectId}:`, error);
    let detailedMessage = `Projeye ait görevler alınırken bir hata oluştu (Proje ID: ${projectId}). `;
    if (error.code === "failed-precondition" || (error.message && error.message.toLowerCase().includes("index required"))) {
        detailedMessage += "Bu hata, Firestore'da bu sorgu için gerekli bir veritabanı indeksinin eksik olmasından kaynaklanmaktadır. ";
        detailedMessage += "Lütfen SUNUCU KONSOLU loglarında veya tarayıcınızın GELİŞTİRİCİ KONSOLU'nda '[SERVICE_ERROR]' ile başlayan orijinal Firestore hata mesajını bulun. ";
        detailedMessage += "Bu orijinal mesaj, eksik indeksi Firebase konsolunda oluşturmanız için bir BAĞLANTI içerecektir. İndeksi oluşturduktan sonra birkaç dakika beklemeniz gerekebilir.";
    } else {
        detailedMessage += "Lütfen daha fazla bilgi için SUNUCU KONSOLU loglarındaki veya tarayıcınızın GELİŞTİRİCİ KONSOLU'ndaki '[SERVICE_ERROR]' ile başlayan orijinal hata mesajını kontrol edin.";
    }
    throw new Error(detailedMessage);
  }
}

export async function addTask(taskData: TaskInputData): Promise<Task> {
  try {
    const dataToSave: { [key: string]: any } = { 
      taskName: taskData.taskName,
      project: taskData.project || '', 
      hotel: taskData.hotel,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: Timestamp.fromDate(taskData.dueDate), 
      assignedTo: taskData.assignedTo || [], // Ensure it's an array, even if empty
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (taskData.description !== undefined) { 
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
      assignedTo: taskData.assignedTo || [],
      description: taskData.description,
      createdAt: convertToISOString(newData?.createdAt) || new Date().toISOString(), 
      updatedAt: convertToISOString(newData?.updatedAt) || new Date().toISOString(), 
    };
  } catch (error: any) {
    console.error(`[SERVICE_ERROR] Original error in addTask:`, error);
    throw new Error("Görev eklenirken bir hata oluştu. Detaylar için konsolu kontrol edin.");
  }
}

export async function updateTaskAssignees(taskId: string, assignedTo: string[]): Promise<void> {
  if (!taskId) {
    throw new Error("Görev ID'si, atama güncellemesi için zorunludur.");
  }
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskDocRef, {
      assignedTo: assignedTo,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error(`Error updating task assignees for task ${taskId}: `, error);
    throw new Error(`Görev atamaları güncellenirken bir hata oluştu: ${error.message}`);
  }
}

// Placeholder for a more generic updateTask function if needed later
export async function updateTask(taskId: string, updates: Partial<Omit<TaskInputData, 'dueDate'> & {dueDate?: Date}>): Promise<void> {
  const taskDoc = doc(db, TASKS_COLLECTION, taskId);
  const dataToUpdate: any = { ...updates, updatedAt: serverTimestamp() };

  if (updates.dueDate) {
    dataToUpdate.dueDate = Timestamp.fromDate(updates.dueDate);
  }
  // Ensure assignedTo is handled as an array if it's part of updates
  if (updates.assignedTo && !Array.isArray(updates.assignedTo)) {
    dataToUpdate.assignedTo = [updates.assignedTo];
  } else if (updates.assignedTo) {
    dataToUpdate.assignedTo = updates.assignedTo;
  }


  await updateDoc(taskDoc, dataToUpdate);
}


export async function getTaskCountByStatus(): Promise<{ status: string; count: number }[]> {
  try {
    const tasksCollection = collection(db, TASKS_COLLECTION);
    const taskSnapshot = await getDocs(tasksCollection);
    const statusCounts: { [key: string]: number } = {};

    taskSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const status = data.status || 'Bilinmiyor';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  } catch (error) {
    console.error("Error fetching task count by status: ", error);
    throw new Error("Görev sayıları durumlarına göre alınırken bir hata oluştu.");
  }
}

export async function getTaskCompletionTrend(): Promise<{ month: string; completed: number; created: number }[]> {
  try {
    const tasksCollection = collection(db, TASKS_COLLECTION);
    const q = query(tasksCollection, orderBy('createdAt', 'asc')); // Get all tasks, ordered by creation
    const taskSnapshot = await getDocs(q);
    
    const monthlyData: { [month: string]: { completed: number; created: number } } = {};

    taskSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const createdAt = data.createdAt;
      const dueDate = data.dueDate; // Assuming tasks have a 'completedAt' or similar field when done, or use 'dueDate' for trend
      
      if (createdAt instanceof Timestamp) {
        const createdMonth = createdAt.toDate().toISOString().substring(0, 7); // YYYY-MM
        if (!monthlyData[createdMonth]) {
          monthlyData[createdMonth] = { completed: 0, created: 0 };
        }
        monthlyData[createdMonth].created += 1;

        // For completion, we need a reliable "completed date". 
        // If using dueDate as a proxy for when it *should* be done, or if status is 'Tamamlandı'
        if (data.status === 'Tamamlandı' && dueDate instanceof Timestamp) {
           const dueMonth = dueDate.toDate().toISOString().substring(0, 7); // YYYY-MM
           if (!monthlyData[dueMonth]) {
             monthlyData[dueMonth] = { completed: 0, created: 0 };
           }
           monthlyData[dueMonth].completed += 1;
        } else if (data.status === 'Tamamlandı' && createdAt instanceof Timestamp) {
           // If no specific completion date, assume completed in the month it was created for simplicity
           if (!monthlyData[createdMonth]) {
             monthlyData[createdMonth] = { completed: 0, created: 0 };
           }
           monthlyData[createdMonth].completed += 1;
        }
      }
    });

    return Object.entries(monthlyData).map(([month, counts]) => ({ 
      month, 
      completed: counts.completed,
      created: counts.created 
    })).sort((a,b) => a.month.localeCompare(b.month));

  } catch (error) {
    console.error("Error fetching task completion trend: ", error);
    throw new Error("Görev tamamlama trendi alınırken bir hata oluştu.");
  }
}


export async function getTasksByUserId(userId: string): Promise<Task[]> {
  try {
    const tasksCollection = collection(db, TASKS_COLLECTION);
    // Firestore doesn't directly support 'array-contains' for multiple user checks in assignedTo if it's an array of UIDs.
    // This query assumes assignedTo might be a single string UID or an array where one of the UIDs matches.
    // For arrays, a more complex client-side filter or different data structure might be needed if performance is an issue.
    // For now, let's assume we might be querying for tasks assigned to a single user directly or where user is in an array.
    // A common pattern is to have a separate field like `assigneeIds` as an array for querying.
    // If assignedTo is always a single string UID (even if Task interface shows string[]), this query is fine.
    // If assignedTo is an array, this query might not work as intended for 'array-contains'.
    // We will fetch all tasks and filter client-side for simplicity if `assignedTo` is `string[]`.

    // const q = query(tasksCollection, where('assignedTo', '==', userId), orderBy('dueDate', 'asc'));
    const q = query(tasksCollection, orderBy('createdAt', 'desc')); // Fetch all, then filter
    const taskSnapshot = await getDocs(q);
    const taskList: Task[] = [];
    
    taskSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      let isAssigned = false;
      if (Array.isArray(data.assignedTo) && data.assignedTo.includes(userId)) {
        isAssigned = true;
      } else if (typeof data.assignedTo === 'string' && data.assignedTo === userId) {
        // This case is less likely if your model consistently uses string[]
        isAssigned = true;
      } else if (!data.assignedTo || (Array.isArray(data.assignedTo) && data.assignedTo.length === 0)) {
        // If task is unassigned, it might still be relevant if we change logic later
        // For now, only include if explicitly assigned.
      }


      if(isAssigned){
        taskList.push({
          id: docSnap.id,
          taskName: data.taskName || 'İsimsiz Görev',
          project: data.project || '',
          hotel: data.hotel || 'Bilinmiyor',
          status: data.status || 'Bilinmiyor',
          priority: data.priority || 'Orta',
          dueDate: convertToISOString(data.dueDate),
          assignedTo: Array.isArray(data.assignedTo) ? data.assignedTo : (data.assignedTo ? [data.assignedTo] : []),
          description: data.description,
          createdAt: convertToISOString(data.createdAt),
          updatedAt: convertToISOString(data.updatedAt),
        } as Task);
      }
    });
    // Sort client-side if needed, e.g., by dueDate
    taskList.sort((a, b) => {
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1; // a has due date, b doesn't, so a comes first
        if (b.dueDate) return 1;  // b has due date, a doesn't, so b comes first
        return 0; // neither has due date
    });
    return taskList;
  } catch (error: any) {
    console.error(`Error fetching tasks for user ${userId}: `, error);
    throw new Error(`Kullanıcıya ait görevler alınırken bir hata oluştu: ${error.message}`);
  }
}

export async function getTaskStatsByUserId(userId: string): Promise<{ month: string; completed: number; overdue: number }[]> {
  try {
    const userTasks = await getTasksByUserId(userId); // Re-use the above function
    const monthlyStats: { [month: string]: { completed: number; overdue: number } } = {};
    const now = new Date();
    const { format } = await import('date-fns'); // Dynamically import format from date-fns

    userTasks.forEach(task => {
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const monthYear = format(dueDate, 'yyyy-MM'); // e.g., "2023-01" for Chart

        if (!monthlyStats[monthYear]) {
          monthlyStats[monthYear] = { completed: 0, overdue: 0 };
        }

        if (task.status === 'Tamamlandı') {
          monthlyStats[monthYear].completed += 1;
        } else if (dueDate < now) { // Not completed and past due date
          monthlyStats[monthYear].overdue += 1;
        }
      }
    });
    
    // Convert to array format suitable for charts
    return Object.entries(monthlyStats)
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Sort by month

  } catch (error: any) {
    console.error(`Error fetching task stats for user ${userId}: `, error);
    throw new Error(`Kullanıcı görev istatistikleri alınırken bir hata oluştu: ${error.message}`);
  }
}

export async function getOverdueTasks(limitCount: number = 5): Promise<Task[]> {
  try {
    const tasksCollection = collection(db, TASKS_COLLECTION);
    const now = Timestamp.now();
    
    const openStatuses = ['Yapılacak', 'Devam Ediyor', 'Gözden Geçiriliyor', 'Engellendi']; 

    const q = query(
      tasksCollection,
      where('dueDate', '<', now),
      where('status', 'in', openStatuses), 
      orderBy('dueDate', 'asc'), 
      firestoreLimit(limitCount)
    );

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
        dueDate: convertToISOString(data.dueDate),
        assignedTo: Array.isArray(data.assignedTo) ? data.assignedTo : (data.assignedTo ? [data.assignedTo] : []),
        description: data.description,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as Task;
    });
    return taskList;
  } catch (error: any) {
    console.error("Error fetching overdue tasks: ", error);
    let userMessage = "Gecikmiş görevler alınırken bir hata oluştu.";
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
        userMessage += " Lütfen Firestore için gerekli index'in oluşturulduğundan emin olun. Hata mesajında index oluşturma linki olabilir.";
    }
    throw new Error(userMessage);
  }
}
