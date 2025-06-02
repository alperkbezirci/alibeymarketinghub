
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { config as dotenvConfig } from 'dotenv';

// --- BEGIN ENHANCED DIAGNOSTIC LOG ---
// Attempt to explicitly load /workspace/.env if Next.js isn't picking it up automatically
// This is more common in plain Node.js scripts, but might help in some SSR contexts or specific environments.
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const envPath = '/workspace/.env'; // Path specific to Firebase Studio
  console.log(`!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Attempting to load .env from: ${envPath} !!!!!!!!!!!`);
  const result = dotenvConfig({ path: envPath });
  if (result.error) {
    console.warn(`!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - dotenv.config error (this might be okay if Next.js handles .env): ${result.error.message} !!!!!!!!!!!`);
  } else {
    console.log(`!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - dotenv.config loaded. Parsed keys: ${Object.keys(result.parsed || {}).join(', ')} !!!!!!!!!!!`);
  }
}


console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - TOP OF FILE AFTER DOTENV ATTEMPT !!!!!!!!!!!");

const requiredEnvVars: Record<string, string | undefined> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let criticalConfigError = false;
let missingVarsMessage = '';
console.log("!!!!!!!!!! FIREBASE CONFIG PRE-CHECK (src/lib/firebase.ts) !!!!!!!!!!!");
for (const varName in requiredEnvVars) {
  const value = requiredEnvVars[varName];
  if (!value) {
    console.error(`ERROR: Missing Firebase environment variable: ${varName}. This MUST be set in your /workspace/.env file and the server restarted.`);
    missingVarsMessage += `${varName} is missing. `;
    criticalConfigError = true;
  } else if ((varName === 'NEXT_PUBLIC_FIREBASE_APP_ID' && (value.includes('YOUR_') || value.includes('placeholder') || value.includes('REPLACE_')))) {
    console.error(`ERROR: Placeholder value detected for NEXT_PUBLIC_FIREBASE_APP_ID: '${value}'. Please replace it with your actual Firebase App ID from the Firebase Console in /workspace/.env and restart the server.`);
    missingVarsMessage += `NEXT_PUBLIC_FIREBASE_APP_ID is still a placeholder: '${value}'. `;
    criticalConfigError = true;
  } else {
    if (varName === 'NEXT_PUBLIC_FIREBASE_API_KEY') {
      console.log(`${varName} is: SET (Length: ${value.length})`);
    } else {
      console.log(`${varName} is: ${value}`);
    }
  }
}
console.log("!!!!!!!!!! END FIREBASE CONFIG PRE-CHECK !!!!!!!!!!!");
// --- END ENHANCED DIAGNOSTIC LOG ---

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Check for critical missing configurations before attempting to initialize
if (criticalConfigError) {
  const fullErrorMsg = "Firebase Initialization Failed: " + missingVarsMessage + "Check your /workspace/.env file, ensure all placeholders (especially App ID) are replaced with actual values, and restart the server.";
  console.error("!!!!!!!!!! " + fullErrorMsg.toUpperCase() + " !!!!!!!!!!!");
  throw new Error(fullErrorMsg);
}

if (typeof window !== 'undefined' && getApps().length > 0) {
  console.log("Firebase app already initialized (client-side), getting existing app.");
  app = getApp();
} else if (getApps().length === 0) {
  try {
    console.log("Initializing Firebase app with config:", {
        apiKey: firebaseConfig.apiKey ? `SET (Length: ${firebaseConfig.apiKey.length})` : "UNDEFINED",
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId ? `SET (Value: ${firebaseConfig.appId})` : "UNDEFINED",
    });
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully.");
  } catch (error) {
    console.error("!!!!!!!!!! FIREBASE INITIALIZATION FAILED (initializeApp call) !!!!!!!!!!!", error);
    // Assign dummy objects to prevent further errors if app init fails, but functionality will be broken.
    app = {} as FirebaseApp; 
    auth = {} as Auth;
    db = {} as Firestore;
    storage = {} as FirebaseStorage;
    console.warn("Assigned dummy Firebase service objects due to initializeApp failure. Firebase functionalities will be broken.");
    throw error; // Re-throw the original initialization error
  }
} else {
  // This case should ideally not be hit if the above check is correct on the server.
  // If it is, it means getApps().length > 0 on the server but it's not the primary initialization.
  console.log("Firebase app already initialized (server-side getApps().length > 0), getting existing app.");
  app = getApp();
}

// Initialize services, ensuring 'app' is a valid FirebaseApp instance.
// These will throw errors if 'app' is not correctly initialized.
try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase services (Auth, Firestore, Storage) obtained successfully.");
} catch (serviceError: any) {
   console.error("!!!!!!!!!! ERROR GETTING FIREBASE SERVICES (getAuth, getFirestore, getStorage) AFTER APP INITIALIZATION ATTEMPT !!!!!!!!!!!", serviceError);
   // Ensure dummy objects are assigned if they weren't already by an app init failure
   auth = auth || {} as Auth;
   db = db || {} as Firestore;
   storage = storage || {} as FirebaseStorage;
   console.warn("Assigned dummy Firebase service objects due to service retrieval error. Firebase functionalities will be broken.");
   // It's important to re-throw if service retrieval fails after app was supposedly initialized.
   // This often indicates the original `app` object was not valid despite not throwing earlier.
   if (app && Object.keys(app).length > 0) { // Check if app is not an empty dummy
        throw serviceError;
   }
}


export { app, auth, db, storage };
