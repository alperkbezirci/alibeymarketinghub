
// src/services/spending-categories-service.ts
'use server'; 
/**
 * @fileOverview Firestore service for managing spending categories.
 *
 * - getSpendingCategories: Fetches all spending categories.
 * - addSpendingCategory: Adds a new spending category.
 * - updateSpendingCategory: Updates an existing spending category.
 * - deleteSpendingCategory: Deletes a spending category. (Future implementation)
 * - SpendingCategory: Interface for a spending category.
 */

// IMPORTANT: This service assumes Firebase is initialized.
// Create a src/lib/firebase.ts file if you haven't already.
// Example src/lib/firebase.ts:
/*
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
*/
import { db } from '@/lib/firebase'; // Assuming you have this file
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

export interface SpendingCategory {
  id: string;
  name: string;
  limit: number;
}

const CATEGORIES_COLLECTION = 'spendingCategories';

export async function getSpendingCategories(): Promise<SpendingCategory[]> {
  try {
    const categoriesCollection = collection(db, CATEGORIES_COLLECTION);
    const q = query(categoriesCollection, orderBy("name")); // Order by name
    const categorySnapshot = await getDocs(q);
    const categoryList = categorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as { name: string; limit: number }),
    }));
    return categoryList;
  } catch (error) {
    console.error("Error fetching spending categories: ", error);
    throw new Error("Harcama kategorileri alınırken bir hata oluştu.");
  }
}

export async function addSpendingCategory(name: string, limit: number): Promise<SpendingCategory> {
  try {
    if (limit < 0) {
        throw new Error("Limit 0'dan küçük olamaz.");
    }
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
      name,
      limit,
    });
    return { id: docRef.id, name, limit };
  } catch (error) {
    console.error("Error adding spending category: ", error);
    throw new Error("Harcama kategorisi eklenirken bir hata oluştu.");
  }
}

export async function updateSpendingCategory(id: string, name: string, limit: number): Promise<void> {
  try {
    if (limit < 0) {
        throw new Error("Limit 0'dan küçük olamaz.");
    }
    const categoryDoc = doc(db, CATEGORIES_COLLECTION, id);
    await updateDoc(categoryDoc, { name, limit });
  } catch (error) {
    console.error("Error updating spending category: ", error);
    throw new Error("Harcama kategorisi güncellenirken bir hata oluştu.");
  }
}

export async function deleteSpendingCategory(id: string): Promise<void> {
  try {
    const categoryDoc = doc(db, CATEGORIES_COLLECTION, id);
    await deleteDoc(categoryDoc);
  } catch (error) {
    console.error("Error deleting spending category: ", error);
    throw new Error("Harcama kategorisi silinirken bir hata oluştu.");
  }
}
