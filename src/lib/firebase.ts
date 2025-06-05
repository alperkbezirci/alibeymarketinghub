
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// TODO: Production için bu hassas bilgileri Firebase konsolundan alıp
// NEXT_PUBLIC_FIREBASE_API_KEY gibi ortam değişkenlerine taşıyın.
// .env.local dosyasında veya hosting platformunuzun ayarlarında tanımlayın.
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
    return servicesCache;
  }

  try {
    const appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const authInstance = getAuth(appInstance);
    const dbInstance = getFirestore(appInstance);
    const storageInstance = getStorage(appInstance);

    servicesCache = {
      app: appInstance,
      auth: authInstance,
      db: dbInstance,
      storage: storageInstance,
    };
    
    console.log("Firebase services initialized successfully.");
    return servicesCache;
  } catch (error: any) {
    console.error("CRITICAL ERROR during Firebase initialization:", error);
    throw new Error(`Firebase initialization failed. Error: ${error.message}.`);
  }
}

// Servisleri başlat ve export et
const { app, auth, db, storage } = initializeFirebaseServices();

export { app, auth, db, storage };
