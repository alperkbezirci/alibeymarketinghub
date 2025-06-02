
// src/lib/firebase.ts
// IMPORTANT: We are relying on Next.js's built-in support for .env files.
// Ensure your Firebase credentials are in a .env or .env.local file in the project root.
// Specifically, /workspace/.env is targeted by these instructions.

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// --- BEGIN ENHANCED DIAGNOSTIC LOG ---
console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Evaluating Firebase configuration from process.env. Expecting .env file at /workspace/.env to be loaded by Next.js !!!!!!!!!!");

const requiredEnvVars: Record<string, string | undefined> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let criticalConfigError = false;
let missingVarsMessage = 'Firebase Initialization Failed:';

for (const varName in requiredEnvVars) {
  const value = requiredEnvVars[varName];
  if (!value) {
    console.error(`ERROR: Missing Firebase environment variable: ${varName}. This MUST be set in your /workspace/.env file and the server restarted.`);
    missingVarsMessage += ` ${varName} is missing.`;
    criticalConfigError = true;
  } else if ((varName === 'NEXT_PUBLIC_FIREBASE_APP_ID' && (value.includes('YOUR_') || value.includes('placeholder') || value.includes('REPLACE_')))) {
    console.error(`ERROR: Firebase environment variable ${varName} in /workspace/.env is still a placeholder: '${value}'. Please replace it with your actual Firebase App ID and restart the server.`);
    missingVarsMessage += ` ${varName} is still a placeholder.`;
    criticalConfigError = true;
  } else {
    console.log(`Firebase environment variable ${varName} is: SET (Length: ${value.length})`);
  }
}

if (criticalConfigError) {
  const fullErrorMsg = missingVarsMessage + " Check your /workspace/.env file, ensure all placeholders (especially App ID) are replaced with actual values, and restart the server.";
  console.error("!!!!!!!!!! " + fullErrorMsg.toUpperCase() + " !!!!!!!!!!!");
  throw new Error(fullErrorMsg);
}

console.log("!!!!!!!!!! FIREBASE CONFIG PRE-CHECK PASSED (all required env vars found and App ID is not a placeholder) !!!!!!!!!!!");
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

// This check is for client-side rendering to prevent re-initialization
// For server-side, getApps().length will likely be 0 on first import per request.
if (typeof window !== 'undefined' && getApps().length > 0) {
  console.log("Firebase app already initialized (client-side getApps().length > 0), getting existing app.");
  app = getApp();
} else if (getApps().length === 0) { // Server-side or first client-side init
  try {
    console.log("Attempting to initialize Firebase app with config (values from process.env):", {
        apiKey: firebaseConfig.apiKey ? 'SET' : 'UNDEFINED',
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId && !firebaseConfig.appId.includes('REPLACE_') ? 'SET' : 'UNDEFINED/PLACEHOLDER',
    });
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully via initializeApp().");
  } catch (error: any) {
    console.error("!!!!!!!!!! FIREBASE SDK initializeApp FAILED !!!!!!!!!!! This usually means the provided config values (though present and checked by pre-check) are incorrect for your Firebase project (e.g., wrong API key for the project ID) or the API key has restrictions preventing its use.", error);
    // To prevent further errors down the line if app is not initialized,
    // we assign dummy objects but still re-throw the error.
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Firestore;
    storage = {} as FirebaseStorage;
    console.warn("Assigned dummy Firebase service objects due to initializeApp failure.");
    throw error; // Re-throw the original Firebase SDK error
  }
} else { // Fallback for any other scenario where getApps().length > 0 (likely server-side subsequent calls within same request lifecycle if modules are cached)
  console.log("Firebase app already initialized (getApps().length > 0, not necessarily client-side), getting existing app.");
  app = getApp();
}

// These will throw if 'app' is not a valid FirebaseApp (e.g. if initializeApp failed and threw)
try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase services (Auth, Firestore, Storage) obtained successfully.");
} catch (serviceError: any) {
   console.error("!!!!!!!!!! ERROR GETTING FIREBASE SERVICES (getAuth, getFirestore, getStorage) AFTER APP INITIALIZATION ATTEMPT !!!!!!!!!!! This can happen if initializeApp() failed silently or `app` is not a valid FirebaseApp object.", serviceError);
   // Ensure dummy objects if they weren't set before, but this path means 'app' was likely problematic.
   auth = auth || {} as Auth;
   db = db || {} as Firestore;
   storage = storage || {} as FirebaseStorage;
   if (app && Object.keys(app).length > 0 && !(app instanceof Error) ) { // Check if app is not an error itself
        // Only re-throw if app was somewhat valid but services failed. If app itself was the problem, the init error was primary.
        // This helps avoid masking the original initializeApp error if it occurred.
        if (!criticalConfigError) throw serviceError; // If criticalConfigError was false, the initial pre-check passed.
   }
}

export { app, auth, db, storage };
