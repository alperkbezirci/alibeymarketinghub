
// src/services/calendar-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing calendar events.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, where } from 'firebase/firestore';

export interface CalendarEvent {
  id: string; // Firestore document ID
  title: string;
  date: Timestamp | string | Date;
  type: "project" | "event" | "task" | string;
  description?: string;
  projectId?: string;
  taskId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const EVENTS_COLLECTION = 'calendarEvents';

export async function getEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
  try {
    const eventsCollection = collection(db, EVENTS_COLLECTION);
    let q;
    if (startDate && endDate) {
        q = query(eventsCollection, 
                  where('date', '>=', Timestamp.fromDate(startDate)), 
                  where('date', '<=', Timestamp.fromDate(endDate)),
                  orderBy('date', 'asc'));
    } else {
        q = query(eventsCollection, orderBy('date', 'asc'));
    }
    
    const eventSnapshot = await getDocs(q);
    const eventList = eventSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : data.date,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      } as CalendarEvent;
    });
    return eventList;
  } catch (error) {
    console.error("Error fetching calendar events: ", error);
    throw new Error("Takvim etkinlikleri alınırken bir hata oluştu.");
  }
}

export async function addEvent(eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
  try {
    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
      ...eventData,
      date: Timestamp.fromDate(new Date(eventData.date as string | Date)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
     return { 
      id: docRef.id, 
      ...eventData, 
      createdAt: Timestamp.now() // Approximate
    } as CalendarEvent;
  } catch (error) {
    console.error("Error adding calendar event: ", error);
    throw new Error("Takvim etkinliği eklenirken bir hata oluştu.");
  }
}

// updateEvent and deleteEvent can be added similarly
