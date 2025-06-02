
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load the .env file from /workspace/.env
// This is crucial if Next.js isn't picking it up automatically in this environment.
// Note: In a standard Next.js setup, this explicit dotenv call might not be necessary
// as Next.js has built-in .env loading. However, for specific environments like Firebase Studio,
// being explicit can help ensure variables are loaded.
const envPath = '/workspace/.env'; // Assuming .env is in the workspace root.
const dotenvResult = dotenv.config({ path: envPath, override: true }); // override: true ensures these values take precedence.

if (dotenvResult.error) {
  console.warn(`!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Warning: Error loading .env file from ${envPath}: ${dotenvResult.error.message}. This might be okay if variables are set via other platform-specific mechanisms. Will proceed to check process.env directly. !!!!!!!!!!`);
} else {
  if (dotenvResult.parsed) {
    console.log(`!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Successfully loaded and parsed .env file from ${envPath}. Variables loaded by dotenv:`, Object.keys(dotenvResult.parsed).join(', '));
  } else {
    console.log(`!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Loaded .env file from ${envPath}, but no variables were parsed (is the file empty or only comments?).`);
  }
}

console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Checking Firebase Environment Variables from process.env (after attempting to load .env) !!!!!!!!!!");

const requiredEnvVarKeys = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

let missingVarsMessage = '';
let criticalConfigError = false;
const placeholderSubstrings = ['YOUR_', 'placeholder', 'REPLACE_'];

const firebaseConfigValues: Record<string, string | undefined> = {};

for (const varName of requiredEnvVarKeys) {
  const value = process.env[varName];
  firebaseConfigValues[varName] = value;
  console.log(`!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Var: ${varName}, Value from process.env: ${value ? 'SET (first few chars: ' + String(value).substring(0,5) + '...)' : 'UNDEFINED or EMPTY'}`);
  if (!value) {
    missingVarsMessage += `${varName} is missing. `;
    criticalConfigError = true;
  } else if (varName === 'NEXT_PUBLIC_FIREBASE_APP_ID' && placeholderSubstrings.some(p => value.toUpperCase().includes(p))) {
    missingVarsMessage += `${varName} is still a placeholder: '${value}'. You MUST replace the placeholder in /workspace/.env and restart the server. `;
    criticalConfigError = true;
  }
}

if (criticalConfigError) {
  const fullErrorMsg = `Firebase Initialization Failed: ${missingVarsMessage}Check your /workspace/.env file, ensure all placeholders (especially App ID) are replaced with actual values, and restart the server.`;
  console.error("!!!!!!!!!! " + fullErrorMsg.toUpperCase() + " !!!!!!!!!!!");
  throw new Error(fullErrorMsg);
}

console.log("!!!!!!!!!! FIREBASE CONFIG PRE-CHECK PASSED (all required env vars found in process.env, and App ID is not a placeholder) !!!!!!!!!!!");

const firebaseConfig = {
  apiKey: firebaseConfigValues.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: firebaseConfigValues.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: firebaseConfigValues.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: firebaseConfigValues.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: firebaseConfigValues.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: firebaseConfigValues.NEXT_PUBLIC_FIREBASE_APP_ID!,
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
  // Re-throw the original Firebase error if it's a Firebase specific error, otherwise our custom one.
  if (error.code && error.code.startsWith('auth/')) {
    throw error;
  } else {
     throw new Error(`Firebase SDK error after config pre-check: ${error.message}. Config used: ${JSON.stringify(firebaseConfig)}`);
  }
}

export { app, auth, db, storage };
