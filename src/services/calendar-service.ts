
// src/services/calendar-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing calendar events.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, where } from 'firebase/firestore';

export interface CalendarEvent {
  id: string; // Firestore document ID
  title: string; // Etkinlik Adı
  eventType?: string; // Etkinlik Türü
  startDate: Timestamp | string | Date; // Başlangıç Tarihi
  endDate: Timestamp | string | Date;   // Bitiş Tarihi
  participants?: string; // Katılımcılar
  location?: string;     // Yer
  description?: string;  // Açıklama
  projectId?: string;    // Opsiyonel, eğer bir projeyle ilişkiliyse
  taskId?: string;       // Opsiyonel, eğer bir görevle ilişkiliyse
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const EVENTS_COLLECTION = 'calendarEvents';

export async function getEvents(viewStartDate?: Date, viewEndDate?: Date): Promise<CalendarEvent[]> {
  try {
    const eventsCollection = collection(db, EVENTS_COLLECTION);
    let q;
    if (viewStartDate && viewEndDate) {
        q = query(eventsCollection,
                  where('startDate', '>=', Timestamp.fromDate(viewStartDate)),
                  where('startDate', '<=', Timestamp.fromDate(viewEndDate)),
                  orderBy('startDate', 'asc'));
    } else {
        q = query(eventsCollection, orderBy('startDate', 'asc'));
    }

    const eventSnapshot = await getDocs(q);
    const eventList = eventSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        eventType: data.eventType || '',
        startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate as string | Date),
        endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate as string | Date),
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
    if (!eventData.startDate || !eventData.endDate) {
      throw new Error("Başlangıç ve bitiş tarihleri zorunludur.");
    }
    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
      ...eventData,
      eventType: eventData.eventType || '',
      startDate: Timestamp.fromDate(new Date(eventData.startDate as string | Date)),
      endDate: Timestamp.fromDate(new Date(eventData.endDate as string | Date)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
     return {
      id: docRef.id,
      ...eventData,
      eventType: eventData.eventType || '',
      startDate: new Date(eventData.startDate as string | Date), // Return as Date
      endDate: new Date(eventData.endDate as string | Date),   // Return as Date
      createdAt: Timestamp.now() // Approximate
    } as CalendarEvent;
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
