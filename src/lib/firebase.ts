// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// --- BEGIN DIAGNOSTIC LOG ---
console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) !!!!!!!!!!!");
console.log("Attempting to initialize Firebase with the following configuration values (API Key and App ID are shown as SET or UNDEFINED for security):");
console.log("process.env.NEXT_PUBLIC_FIREBASE_API_KEY is:", firebaseConfig.apiKey ? "SET" : "UNDEFINED or EMPTY");
console.log("process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is:", firebaseConfig.authDomain);
console.log("process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID is:", firebaseConfig.projectId);
console.log("process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is:", firebaseConfig.storageBucket);
console.log("process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is:", firebaseConfig.messagingSenderId);
console.log("process.env.NEXT_PUBLIC_FIREBASE_APP_ID is:", firebaseConfig.appId ? (firebaseConfig.appId === 'YOUR_FIREBASE_APP_ID_HERE' ? "PLACEHOLDER_VALUE" : "SET") : "UNDEFINED or EMPTY");
console.log("Is NEXT_PUBLIC_FIREBASE_APP_ID still the placeholder?", firebaseConfig.appId === 'YOUR_FIREBASE_APP_ID_HERE');
console.log("!!!!!!!!!! END FIREBASE DEBUG !!!!!!!!!!!");
// --- END DIAGNOSTIC LOG ---

let app: FirebaseApp;

if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully.");
  } catch (error) {
    console.error("!!!!!!!!!! FIREBASE INITIALIZATION FAILED !!!!!!!!!!!", error);
    // Re-throw the error if you want the app to break here, or handle it gracefully
    // For now, we let it proceed so getAuth might throw the more specific error
    // which can sometimes be more informative.
    // throw error; 
    // If we throw here, subsequent getAuth() calls might not happen.
    // To ensure app is defined, we might need a fallback or ensure this path doesn't lead to undefined app.
    // However, if init fails, subsequent calls *should* fail.
    // For the purpose of this error, letting getAuth fail is fine.
    // A production app would need more robust error handling here.
    // As a quick fix if init fails, we assign a dummy object to app to prevent 'app' is not defined errors later,
    // but functions using it will fail.
    app = {} as FirebaseApp; // This is a temporary measure to avoid "app is not defined" errors
                             // but Firebase services will not work.
  }
} else {
  app = getApp();
  console.log("Firebase app already initialized, getting existing app.");
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
