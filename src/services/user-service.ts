
// src/services/user-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing user documents.
 *
 * - createUserDocumentInFirestore: Creates or updates a user document in Firestore.
 * - getAllUsers: Fetches all user documents from Firestore.
 * - updateUserProfile: Updates a user's profile (name, roles) in Firestore.
 * - deleteUserDocument: Deletes a user's document from Firestore.
 */
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp, getDoc, getDocs, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore';
import type { User } from '@/contexts/auth-context'; // Assuming User type from auth-context is suitable

export interface UserProfileData {
  name: string;
  email: string;
  roles: string[];
  createdAt: any; // Firestore serverTimestamp placeholder
  updatedAt?: any; // Firestore serverTimestamp placeholder
  photoURL?: string | null;
}

const USERS_COLLECTION = 'users';

export async function createUserDocumentInFirestore(
  uid: string,
  email: string,
  name: string,
  roles: string[],
  photoURL?: string | null
): Promise<void> {
  if (!uid) {
    throw new Error('UID is required to create/update a user document.');
  }
  if (!email) {
    throw new Error('Email is required for the user document.');
  }
  if (!name) {
    throw new Error('Name is required for the user document.');
  }
  if (!roles || roles.length === 0) {
    throw new Error('At least one role is required for the user document.');
  }

  const userDocRef = doc(db, USERS_COLLECTION, uid);

  try {
    const docSnap = await getDoc(userDocRef);
    const userData: Partial<UserProfileData> = {
      name,
      email,
      roles,
      updatedAt: serverTimestamp(),
    };

    if (photoURL !== undefined) {
      userData.photoURL = photoURL;
    }

    if (!docSnap.exists()) {
      userData.createdAt = serverTimestamp();
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
    const q = query(usersCollection, orderBy("name")); // Order by name for consistency
    const usersSnapshot = await getDocs(q);
    const usersList = usersSnapshot.docs.map(docSnap => {
      const data = docSnap.data() as UserProfileData;
      return {
        uid: docSnap.id,
        email: data.email,
        name: data.name,
        roles: data.roles,
        photoURL: data.photoURL,
        // We might not have createdAt/updatedAt in User type, adjust as needed or extend User type
      } as User; // Cast to User, ensure User type matches
    });
    return usersList;
  } catch (error) {
    console.error("Error fetching all users: ", error);
    throw new Error("Tüm kullanıcılar alınırken bir hata oluştu.");
  }
}

export async function updateUserProfile(uid: string, name: string, roles: string[]): Promise<void> {
  if (!uid) {
    throw new Error('UID is required to update a user document.');
  }
  if (!name) {
    throw new Error('Name is required for the user document.');
  }
  if (!roles || roles.length === 0) {
    throw new Error('At least one role is required for the user document.');
  }

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    await updateDoc(userDocRef, {
      name,
      roles,
      updatedAt: serverTimestamp(),
    });
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
