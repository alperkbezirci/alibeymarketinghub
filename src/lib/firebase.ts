
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore'; // DÜZELTİLDİ
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const FIREBASE_CONFIG_VERSION = 'v16_import_fix'; // Sürüm etiketi güncellendi

const firebaseConfig = {
  apiKey: "AIzaSyCQSBJ_Et7Le_kCl_LoscVyM7sc6R86jzQ",
  authDomain: "alibey-marketing-hub.firebaseapp.com",
  projectId: "alibey-marketing-hub",
  storageBucket: "alibey-marketing-hub.firebasestorage.app",
  messagingSenderId: "666761005327",
  appId: "1:666761005327:web:81488b564f0a1a7fdd967a",
  measurementId: "G-5HWNW75QNM"
};

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let servicesCache: FirebaseServices | null = null;

function initializeFirebaseServices(): FirebaseServices {
  if (servicesCache) {
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Returning cached Firebase services.`);
    return servicesCache;
  }

  try {
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Initializing Firebase services...`);
    const appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase app instance ${getApps().length === 1 ? 'newly initialized' : 'retrieved'}.`);

    const authInstance = getAuth(appInstance);
    const dbInstance = getFirestore(appInstance); // Artık doğru import ile çalışmalı
    const storageInstance = getStorage(appInstance);

    servicesCache = {
      app: appInstance,
      auth: authInstance,
      db: dbInstance,
      storage: storageInstance,
    };
    
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase services initialized and cached.`);
    return servicesCache;
  } catch (error: any) {
    console.error(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] CRITICAL ERROR during Firebase initialization:`, error);
    // Hatanın daha görünür olması için fırlatıyoruz, bu sayede Next.js hata sayfasında daha net görülür.
    throw new Error(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase initialization failed. Error: ${error.message}. Check console for details and firebaseConfig in src/lib/firebase.ts. Import paths might be incorrect.`);
  }
}

// Servisleri başlat ve export et
const { app, auth, db, storage } = initializeFirebaseServices();

export { app, auth, db, storage };
