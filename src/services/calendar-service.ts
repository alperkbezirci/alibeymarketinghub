
// src/services/calendar-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing calendar events.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, where } from 'firebase/firestore';

// Helper to safely convert Firestore Timestamps or Dates to ISO strings
const convertToISOString = (dateField: Timestamp | Date | string | undefined): string | undefined => {
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

export interface CalendarEvent {
  id: string; // Firestore document ID
  title: string;
  eventType?: string;
  startDate: string; // Changed to string
  endDate: string;   // Changed to string
  participants?: string;
  location?: string;
  description?: string;
  projectId?: string;
  taskId?: string;
  createdAt?: string; // Changed to string
  updatedAt?: string; // Changed to string
}

export interface CalendarEventInputData {
  title: string;
  eventType?: string;
  startDate: Date; // Expect Date from form
  endDate: Date;   // Expect Date from form
  participants?: string;
  location?: string;
  description?: string;
  projectId?: string;
  taskId?: string;
}


const EVENTS_COLLECTION = 'calendarEvents';

export async function getEvents(viewStartDate?: Date, viewEndDate?: Date): Promise<CalendarEvent[]> {
  try {
    const eventsCollection = collection(db, EVENTS_COLLECTION);
    let q;
    if (viewStartDate && viewEndDate) {
        // Firestore expects Timestamps for date range queries
        q = query(eventsCollection,
                  where('startDate', '>=', Timestamp.fromDate(viewStartDate)),
                  where('startDate', '<=', Timestamp.fromDate(viewEndDate)), // Query by startDate for relevance in month view
                  orderBy('startDate', 'asc'));
    } else {
        q = query(eventsCollection, orderBy('startDate', 'asc'));
    }

    const eventSnapshot = await getDocs(q);
    const eventList = eventSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        eventType: data.eventType || '',
        startDate: convertToISOString(data.startDate)!, // startDate is mandatory
        endDate: convertToISOString(data.endDate)!,   // endDate is mandatory
        participants: data.participants,
        location: data.location,
        description: data.description,
        projectId: data.projectId,
        taskId: data.taskId,
        createdAt: convertToISOString(data.createdAt),
        updatedAt: convertToISOString(data.updatedAt),
      } as CalendarEvent;
    });
    return eventList;
  } catch (error) {
    console.error("Error fetching calendar events: ", error);
    throw new Error("Takvim etkinlikleri alınırken bir hata oluştu.");
  }
}

export async function addEvent(eventData: CalendarEventInputData): Promise<CalendarEvent> {
  try {
    if (!eventData.startDate || !eventData.endDate) {
      throw new Error("Başlangıç ve bitiş tarihleri zorunludur.");
    }
    const dataToSave = {
      ...eventData,
      eventType: eventData.eventType || '',
      startDate: Timestamp.fromDate(eventData.startDate),
      endDate: Timestamp.fromDate(eventData.endDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), dataToSave);
     return {
      id: docRef.id,
      title: eventData.title,
      eventType: eventData.eventType || '',
      startDate: eventData.startDate.toISOString(),
      endDate: eventData.endDate.toISOString(),
      participants: eventData.participants,
      location: eventData.location,
      description: eventData.description,
      projectId: eventData.projectId,
      taskId: eventData.taskId,
      createdAt: new Date().toISOString(), // Approximation
      updatedAt: new Date().toISOString(), // Approximation
    };
  } catch (error) {
    console.error("Error adding calendar event: ", error);
    throw new Error("Takvim etkinliği eklenirken bir hata oluştu.");
  }
}

// updateEvent and deleteEvent can be added similarly
// export async function updateEvent(id: string, eventData: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
//   const eventDoc = doc(db, EVENTS_COLLECTION, id);
//   const updateData: any = { ...eventData, updatedAt: serverTimestamp() };
//   if (eventData.startDate) {
//     updateData.startDate = Timestamp.fromDate(new Date(eventData.startDate as string | Date));
//   }
//   if (eventData.endDate) {
//     updateData.endDate = Timestamp.fromDate(new Date(eventData.endDate as string | Date));
//   }
//   if (eventData.eventType) { // Handle eventType update
//     updateData.eventType = eventData.eventType;
//   }
//   await updateDoc(eventDoc, updateData);
// }

// export async function deleteEvent(id: string): Promise<void> {
//   const eventDoc = doc(db, EVENTS_COLLECTION, id);
//   await deleteDoc(eventDoc);
// }
