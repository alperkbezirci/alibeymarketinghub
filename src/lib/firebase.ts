
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const FIREBASE_CONFIG_VERSION = 'v11_singleton_init_correct_storage'; // Updated version for logging

// Your web app's Firebase configuration using values you provided
const firebaseConfig = {
  apiKey: "AIzaSyCQSBJ_Et7Le_kCl_LoscVyM7sc6R86jzQ",
  authDomain: "alibey-marketing-hub.firebaseapp.com",
  projectId: "alibey-marketing-hub",
  storageBucket: "alibey-marketing-hub.firebasestorage.app", // Corrected based on your explicit config dump
  messagingSenderId: "666761005327",
  appId: "1:666761005327:web:81488b564f0a1a7fdd967a",
  measurementId: "G-5HWNW75QNM" // Optional, included as you provided it
};

let appInstance: FirebaseApp;

console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase module loading. Checking for existing apps...`);
if (getApps().length === 0) {
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] No Firebase apps initialized. Initializing new app...`);
  try {
    appInstance = initializeApp(firebaseConfig);
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] New Firebase app initialized successfully.`);
  } catch (e) {
    console.error(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] CRITICAL ERROR during initializeApp:`, e);
    throw e; // Re-throw to make it clear initialization failed
  }
} else {
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Existing Firebase app found. Getting app instance...`);
  appInstance = getApp();
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Existing Firebase app instance retrieved.`);
}

let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

try {
  authInstance = getAuth(appInstance);
  dbInstance = getFirestore(appInstance);
  storageInstance = getStorage(appInstance);
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase services (Auth, Firestore, Storage) initialized and ready for export.`);
} catch (e) {
  console.error(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] CRITICAL ERROR during service initialization (Auth, Firestore, or Storage):`, e);
  // Depending on the error, you might still want to export appInstance if it's valid
  // but for now, let's be strict.
  throw e; // Re-throw
}

export { appInstance as app, authInstance as auth, dbInstance as db, storageInstance as storage };
