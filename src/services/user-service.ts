
// src/services/user-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing user documents.
 *
 * - createUserDocumentInFirestore: Creates or updates a user document in Firestore.
 * - getAllUsers: Fetches all user documents from Firestore.
 * - updateUserProfile: Updates a user's profile in Firestore.
 * - deleteUserDocument: Deletes a user's document from Firestore.
 * - getUserRoles: Fetches a user's roles from Firestore.
 */
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp, getDoc, getDocs, updateDoc, deleteDoc, query, Timestamp } from 'firebase/firestore';
import type { User } from '@/contexts/auth-context';

export interface UserProfileData {
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  organization?: string;
  roles: string[];
  authorizationLevel?: string;
  createdAt: Timestamp; // Firestore serverTimestamp placeholder
  updatedAt?: Timestamp; // Firestore serverTimestamp placeholder
  photoURL?: string | null;
}

const USERS_COLLECTION = 'users';

export async function createUserDocumentInFirestore(
  uid: string,
  email: string,
  firstName: string,
  lastName: string,
  roles: string[],
  title?: string,
  organization?: string,
  authorizationLevel?: string,
  photoURL?: string | null
): Promise<void> {
  if (!uid) throw new Error('UID is required to create/update a user document.');
  if (!email) throw new Error('Email is required for the user document.');
  if (!firstName) throw new Error('First name is required for the user document.');
  if (!lastName) throw new Error('Last name is required for the user document.');
  if (!roles || roles.length === 0) throw new Error('At least one role is required for the user document.');

  const userDocRef = doc(db, USERS_COLLECTION, uid);

  try {
    const docSnap = await getDoc(userDocRef);
    const userData: Partial<UserProfileData> = {
      email,
      firstName,
      lastName,
      roles,
      title: title || '', // Ensure undefined is not sent if not provided
      organization: organization || '',
      authorizationLevel: authorizationLevel || '',
      updatedAt: serverTimestamp() as Timestamp,
    };

    if (photoURL !== undefined) {
      userData.photoURL = photoURL;
    }

    if (!docSnap.exists()) {
      userData.createdAt = serverTimestamp() as Timestamp;
    }

    await setDoc(userDocRef, userData, { merge: true });
    console.log(`User document for UID: ${uid} successfully written/updated in Firestore.`);
  } catch (error) {
    console.error('Error writing user document to Firestore: ', error);
    throw new Error(
      'Kullanıcı belgesi Firestore tarafında oluşturulurken/güncellenirken bir hata oluştu.'
    );
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const usersCollection = collection(db, USERS_COLLECTION);
    const q = query(usersCollection); 
    const usersSnapshot = await getDocs(q);
    const usersList = usersSnapshot.docs.map(docSnap => {
      const data = docSnap.data() as UserProfileData;
      return {
        uid: docSnap.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        title: data.title,
        organization: data.organization,
        roles: data.roles || [], 
        authorizationLevel: data.authorizationLevel,
        photoURL: data.photoURL,
      } as User; 
    });
    return usersList;
  } catch (error) {
    console.error("Error fetching all users: ", error);
    throw new Error("Tüm kullanıcılar alınırken bir hata oluştu.");
  }
}

export async function getUserRoles(uid: string): Promise<string[] | null> {
  if (!uid) {
    console.warn("[user-service] getUserRoles: UID is required.");
    return null;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();
      if (userData && Array.isArray(userData.roles)) {
        return userData.roles as string[];
      } else {
        console.warn(`[user-service] getUserRoles: User ${uid} document exists but 'roles' field is missing or not an array.`);
        return []; // Return empty array if roles field is malformed
      }
    } else {
      console.warn(`[user-service] getUserRoles: No user document found for UID: ${uid}`);
      return null; // User document doesn't exist
    }
  } catch (error) {
    console.error(`[user-service] getUserRoles: Error fetching roles for UID ${uid}:`, error);
    return null; 
  }
}


export async function updateUserProfile(
  uid: string,
  firstName: string,
  lastName: string,
  roles: string[],
  title?: string,
  organization?: string,
  authorizationLevel?: string
): Promise<void> {
  if (!uid) throw new Error('UID is required to update a user document.');
  if (!firstName) throw new Error('First name is required for the user document.');
  if (!lastName) throw new Error('Last name is required for the user document.');
  if (!roles || roles.length === 0) throw new Error('At least one role is required for the user document.');
  
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    const updateData: Partial<UserProfileData> = {
      firstName,
      lastName,
      roles,
      title: title || '',
      organization: organization || '',
      authorizationLevel: authorizationLevel || '',
      updatedAt: serverTimestamp() as Timestamp,
    };
    await updateDoc(userDocRef, updateData);
    console.log(`User profile for UID: ${uid} successfully updated in Firestore.`);
  } catch (error) {
    console.error('Error updating user profile in Firestore: ', error);
    throw new Error('Kullanıcı profili güncellenirken bir hata oluştu.');
  }
}

export async function deleteUserDocument(uid: string): Promise<void> {
  if (!uid) {
    throw new Error('UID is required to delete a user document.');
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    await deleteDoc(userDocRef);
    console.log(`User document for UID: ${uid} successfully deleted from Firestore.`);
  } catch (error) {
    console.error('Error deleting user document from Firestore: ', error);
    throw new Error('Kullanıcı belgesi Firestore\'dan silinirken bir hata oluştu.');
  }
}
