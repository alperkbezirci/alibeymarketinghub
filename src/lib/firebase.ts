
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Define the exact environment variable names expected, using underscores
const ENV_VAR_NAMES = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
};

// Firebase yapılandırmasını ortam değişkenlerinden al
const firebaseConfig = {
  apiKey: process.env[ENV_VAR_NAMES.apiKey],
  authDomain: process.env[ENV_VAR_NAMES.authDomain],
  projectId: process.env[ENV_VAR_NAMES.projectId],
  storageBucket: process.env[ENV_VAR_NAMES.storageBucket],
  messagingSenderId: process.env[ENV_VAR_NAMES.messagingSenderId],
  appId: process.env[ENV_VAR_NAMES.appId],
};

// Ortam değişkenlerinin varlığını kontrol etme
let allVarsPresent = true;
let missingVarsMessage = "Firebase Initialization Failed: ";
const envVarValuesForLogging: Record<string, string | undefined> = {};

console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Ortam değişkenleri KONTROL EDİLİYOR (Underscore version)... !!!!!!!!!!");

// Kontrol edilecek değişkenlerin listesi (ENV_VAR_NAMES objesindeki değerler)
const expectedEnvVarKeys = Object.values(ENV_VAR_NAMES);

for (const envVarName of expectedEnvVarKeys) {
  const value = process.env[envVarName]; // Doğrudan process.env'den oku
  
  envVarValuesForLogging[envVarName] = value; // Loglama için sakla
  if (!value) {
    allVarsPresent = false;
    missingVarsMessage += `${envVarName} is missing. `; // Hata mesajına ekle
  }
}

console.log("!!!!!!!!!! ALL NEXT_PUBLIC_FIREBASE_ ENV VARS AS SEEN BY THE APP (src/lib/firebase.ts): !!!!!!!!!!");
for (const key in envVarValuesForLogging) {
    // API anahtarını logda gizle
    const displayValue = (key === ENV_VAR_NAMES.apiKey && envVarValuesForLogging[key]) ? "LOGGED_BUT_HIDDEN" : envVarValuesForLogging[key];
    console.log(`!!!!!!!!!! ${key}: ${displayValue || "DEĞER_YOK_VEYA_UNDEFINED"} !!!!!!!!!!`);
}

if (!allVarsPresent) {
  missingVarsMessage += "Check your /workspace/.env.local file, ensure all environment variables are correctly set (using underscores like NEXT_PUBLIC_FIREBASE_API_KEY), all actual values are filled in, and restart the server.";
  console.error("!!!!!!!!!! " + missingVarsMessage.toUpperCase() + " !!!!!!!!!!!");
  throw new Error(missingVarsMessage);
}

// App ID için özel yer tutucu kontrolü (artık doğrudan process.env'den okunan değere göre yapılıyor)
const currentAppId = process.env[ENV_VAR_NAMES.appId];
const PLACEHOLDER_APP_ID_HASH_PATTERN = "YOUR_APP_ID_HASH_GOES_HERE_REPLACE_ME";
const PLACEHOLDER_APP_ID_HASH_PATTERN_ALT = "REPLACE_THIS_WITH_THE_UNIQUE_HASH_FROM_YOUR_FIREBASE_APP_ID";
const PLACEHOLDER_APP_ID_FULL_EXAMPLE = "1:YOUR_PROJECT_NUMBER:web:REPLACE_WITH_YOUR_ACTUAL_APP_ID_HASH";

if (currentAppId && (
    currentAppId.includes(PLACEHOLDER_APP_ID_HASH_PATTERN) || 
    currentAppId.includes(PLACEHOLDER_APP_ID_HASH_PATTERN_ALT) ||
    currentAppId.includes(PLACEHOLDER_APP_ID_FULL_EXAMPLE) ||
    currentAppId.toUpperCase().includes("REPLACE_THIS") || 
    currentAppId.toUpperCase().includes("YOUR_APP_ID") 
    )
   ) {
    const placeholderErrorMsg = `Firebase Initialization Halted: The '${ENV_VAR_NAMES.appId}' ('${currentAppId}') in your environment variables still appears to contain a placeholder. You MUST replace it with your ACTUAL Firebase Web App ID.`;
    console.error("!!!!!!!!!! " + placeholderErrorMsg.toUpperCase() + " !!!!!!!!!!!");
    throw new Error(placeholderErrorMsg);
}

// App ID için basit bir uzunluk kontrolü (çok kısa olmamalı)
if (currentAppId && currentAppId.length < 20) { 
    const shortAppIdErrorMsg = `Firebase Initialization Halted: The '${ENV_VAR_NAMES.appId}' ('${currentAppId}') in your environment variables seems too short. Please ensure you have entered the complete App ID from your Firebase console.`;
    console.error("!!!!!!!!!! " + shortAppIdErrorMsg.toUpperCase() + " !!!!!!!!!!!");
    throw new Error(shortAppIdErrorMsg);
}

console.log("!!!!!!!!!! Firebase configuration environment variable checks PASSED. Attempting to initialize Firebase... !!!!!!!!!!");

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  // firebaseConfig objesi artık doğrudan process.env'den okunan değerlerle dolu
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("!!!!!!!!!! Firebase app initialized successfully using environment variables. !!!!!!!!!!");
  } else {
    app = getApp();
    console.log("!!!!!!!!!! Firebase app already initialized, using existing configuration with environment variables. !!!!!!!!!!");
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("!!!!!!!!!! Firebase services (Auth, Firestore, Storage) obtained successfully using environment variable config. !!!!!!!!!!");
} catch (error: any) {
  console.error("!!!!!!!!!! FIREBASE SDK INITIALIZATION OR SERVICE RETRIEVAL FAILED (with environment variables)! This usually means the config values in your .env.local file are incorrect for your Firebase project OR there are restrictions preventing the API key usage.", error);
  const safeConfigForLogging = { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? "LOGGED_BUT_HIDDEN" : undefined };
  console.error("!!!!!!!!!! Firebase configuration used during failed attempt (API Key is hidden in this log):", JSON.stringify(safeConfigForLogging, null, 2));
  throw error; // Re-throw the original Firebase SDK error
}

export { app, auth, db, storage };
