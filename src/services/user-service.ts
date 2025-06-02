
// src/services/user-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing user documents.
 *
 * - createUserDocumentInFirestore: Creates or updates a user document in Firestore.
 */
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export interface UserProfileData {
  name: string;
  email: string;
  roles: string[];
  createdAt: any; // Firestore serverTimestamp placeholder
  updatedAt?: any; // Firestore serverTimestamp placeholder
  photoURL?: string | null;
}

const USERS_COLLECTION = 'users';

/**
 * Creates or updates a user document in Firestore with the provided data.
 * This function should ideally be called after a user is successfully created
 * or confirmed in Firebase Authentication.
 *
 * @param uid - The UID of the user from Firebase Authentication.
 * @param email - The user's email.
 * @param name - The user's display name.
 * @param roles - An array of user roles.
 * @param photoURL - (Optional) The user's photo URL.
 * @returns A promise that resolves when the document is successfully written.
 * @throws Throws an error if required parameters are missing or if Firestore operation fails.
 */
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

    if (photoURL !== undefined) { // Allow explicitly setting photoURL to null or a string
      userData.photoURL = photoURL;
    }

    if (!docSnap.exists()) {
      userData.createdAt = serverTimestamp();
    }

    await setDoc(userDocRef, userData, { merge: true }); // Use merge: true to update or create
    console.log(`User document for UID: ${uid} successfully written/updated in Firestore.`);
  } catch (error) {
    console.error('Error writing user document to Firestore: ', error);
    throw new Error(
      'Kullanıcı belgesi Firestore tarafında oluşturulurken/güncellenirken bir hata oluştu.'
    );
  }
}

// Example of how you might call this after creating an Auth user and getting their UID:
/*
async function setupAlperUser() {
  // STEP 1: Create user in Firebase Authentication (e.g., via Firebase Console)
  // Obtain the UID from Firebase Authentication for 'akucukbezirci@alibey.com'
  const alperUID = "MANUALLY_OBTAINED_UID_FROM_FIREBASE_AUTH"; // Replace with actual UID

  if (alperUID === "MANUALLY_OBTAINED_UID_FROM_FIREBASE_AUTH") {
    console.warn("Please replace MANUALLY_OBTAINED_UID_FROM_FIREBASE_AUTH with the actual UID.");
    return;
  }

  const userDetails = {
    email: "akucukbezirci@alibey.com",
    name: "Alper Küçükbezirci",
    roles: ["Pazarlama Müdürü", "Admin"],
    // photoURL: "https://example.com/alper.jpg" // Optional
  };

  try {
    await createUserDocumentInFirestore(
      alperUID,
      userDetails.email,
      userDetails.name,
      userDetails.roles
      // userDetails.photoURL // Uncomment if you have a photoURL
    );
    console.log("Alper Küçükbezirci user document created in Firestore.");
  } catch (error) {
    console.error("Failed to create Alper Küçükbezirci user document:", error);
  }
}

// To run this example, you would need to call setupAlperUser() from a suitable place,
// like a one-time script or an admin utility function.
*/
