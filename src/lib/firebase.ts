
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const FIREBASE_CONFIG_VERSION = 'v13_classic_singleton'; // Ensure this is unique for logging

const firebaseConfig = {
  apiKey: "AIzaSyCQSBJ_Et7Le_kCl_LoscVyM7sc6R86jzQ",
  authDomain: "alibey-marketing-hub.firebaseapp.com",
  projectId: "alibey-marketing-hub",
  storageBucket: "alibey-marketing-hub.firebasestorage.app",
  messagingSenderId: "666761005327",
  appId: "1:666761005327:web:81488b564f0a1a7fdd967a",
  measurementId: "G-5HWNW75QNM"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase module loading. Initializing services...`);
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] New Firebase app initialized.`);
  } else {
    app = getApp();
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Existing Firebase app retrieved.`);
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase app and services initialized and ready for export.`);

} catch (error) {
  console.error(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] CRITICAL ERROR during Firebase initialization:`, error);
  // Hata durumunda, export edilecek değişkenlerin tanımsız kalmaması için bir fallback düşünülebilir
  // ancak bu durumda uygulamanın Firebase özellikleri çalışmayacaktır.
  // Şimdilik, hatayı fırlatmak ve konsolda loglamak en iyisi.
  throw new Error(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase initialization failed. See console for details.`);
}

export { app, auth, db, storage };
