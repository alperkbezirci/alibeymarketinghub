
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const FIREBASE_CONFIG_VERSION = 'v10_robust_init'; // Updated version for logging

// Your web app's Firebase configuration using values you provided
const firebaseConfig = {
  apiKey: "AIzaSyCQSBJ_Et7Le_kCl_LoscVyM7sc6R86jzQ",
  authDomain: "alibey-marketing-hub.firebaseapp.com",
  projectId: "alibey-marketing-hub",
  storageBucket: "alibey-marketing-hub.firebasestorage.app", // From your explicit config dump
  messagingSenderId: "666761005327",
  appId: "1:666761005327:web:81488b564f0a1a7fdd967a",
  measurementId: "G-5HWNW75QNM" // Optional, included as you provided it
};

let _app: FirebaseApp; // Local variable for initialization

try {
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Initializing Firebase app instance...`);
  if (!getApps().length) { // Check if no apps are initialized
    _app = initializeApp(firebaseConfig);
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] New Firebase app initialized successfully.`);
  } else {
    _app = getApp(); // Get the default app if already initialized
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Existing Firebase app instance retrieved.`);
  }
} catch (error: any) {
  console.error(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] CRITICAL ERROR during Firebase app instance initialization:`, error);
  // This error is critical and should stop the app.
  throw new Error(`Firebase App Instantiation Failed (${FIREBASE_CONFIG_VERSION}): ${error.message}. App cannot start.`);
}

// Export the initialized app and services as constants
export const app: FirebaseApp = _app;
export const auth: Auth = getAuth(_app);
export const db: Firestore = getFirestore(_app);
export const storage: FirebaseStorage = getStorage(_app);

console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase app and services exported and ready.`);
