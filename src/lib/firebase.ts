// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Log all environment variables starting with NEXT_PUBLIC_FIREBASE_ to see what the app receives
console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Module loaded. Checking process.env for Firebase vars. !!!!!!!!!!");
const allEnvVars: Record<string, string | undefined> = {};
if (typeof process !== 'undefined' && process.env) {
  for (const key in process.env) {
    if (key.startsWith("NEXT_PUBLIC_FIREBASE_")) {
      allEnvVars[key] = process.env[key];
    }
  }
}
console.log("!!!!!!!!!! ALL NEXT_PUBLIC_FIREBASE_ ENV VARS SEEN BY THE APP (at module load):", JSON.stringify(allEnvVars, null, 2));


const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const requiredEnvVarKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

let missingVarsMessage = '';
let criticalConfigError = false;
const placeholderSubstrings = ['YOUR_', 'placeholder', 'REPLACE_'];

console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Starting pre-check of Firebase config values from process.env !!!!!!!!!!");
for (const key of requiredEnvVarKeys) {
  const varName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}` as keyof typeof firebaseConfigValues;
  const value = firebaseConfigValues[key];

  console.log(`!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Var: ${varName}, Value from process.env: ${value ? 'SET (length: ' + String(value).length + ')' : 'UNDEFINED or EMPTY'}`);

  if (!value) {
    missingVarsMessage += `${varName} is missing. `;
    criticalConfigError = true;
  } else if (key === 'appId' && placeholderSubstrings.some(p => String(value).toUpperCase().includes(p))) {
    missingVarsMessage += `${varName} is still a placeholder: '${value}'. You MUST replace the placeholder in /workspace/.env or /workspace/.env.local and restart the server. `;
    criticalConfigError = true;
  }
}

if (criticalConfigError) {
  const fullErrorMsg = `Firebase Initialization Failed: ${missingVarsMessage}Check your /workspace/.env or /workspace/.env.local file, ensure all placeholders (especially App ID) are replaced with actual values, and restart the server.`;
  console.error("!!!!!!!!!! " + fullErrorMsg.toUpperCase() + " !!!!!!!!!!!");
  throw new Error(fullErrorMsg);
} else {
    console.log("!!!!!!!!!! FIREBASE CONFIG PRE-CHECK PASSED (all required env vars found in process.env, and App ID is not a placeholder) !!!!!!!!!!!");
}

const firebaseConfig = {
  apiKey: firebaseConfigValues.apiKey!,
  authDomain: firebaseConfigValues.authDomain!,
  projectId: firebaseConfigValues.projectId!,
  storageBucket: firebaseConfigValues.storageBucket!,
  messagingSenderId: firebaseConfigValues.messagingSenderId!,
  appId: firebaseConfigValues.appId!,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  if (getApps().length === 0) {
    console.log("Attempting to initialize Firebase app with resolved config:", firebaseConfig);
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully via initializeApp().");
  } else {
    console.log("Firebase app already initialized (getApps().length > 0), getting existing app.");
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase services (Auth, Firestore, Storage) obtained successfully.");
} catch (error: any) {
  console.error("!!!!!!!!!! FIREBASE SDK INITIALIZATION OR SERVICE GET FAILED !!!!!!!!!!! This usually means the provided config values (though present and checked by pre-check) are incorrect for your Firebase project OR the API key has restrictions preventing its use.", error);
  console.error("Firebase config used during failed attempt:", firebaseConfig);
  throw error;
}

export { app, auth, db, storage };
