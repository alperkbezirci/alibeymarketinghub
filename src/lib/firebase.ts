
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// !!!!! UYARI: BU YÖNTEM GEÇİCİ BİR HATA AYIKLAMA ADIMIDIR VE GÜVENLİ DEĞİLDİR !!!!!
// Firebase yapılandırması doğrudan koda gömülmüştür.
// BU ASLA ÜRETİMDE VEYA PAYLAŞILAN KODDA KULLANILMAMALIDIR.
const firebaseConfig = {
  apiKey: "AIzaSyCQSBJ_Et7Le_kCl_LoscVyM7sc6R86jzQ",
  authDomain: "alibey-marketing-hub.firebaseapp.com",
  projectId: "alibey-marketing-hub",
  storageBucket: "alibey-marketing-hub.appspot.com",
  messagingSenderId: "666761005327",
  appId: "1:666761005327:web:81488b564f0a1a7fdd967a" // Kullanıcı tarafından sağlanan doğru App ID
};

console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts - v4_hardcoded_detailed_logs) - KODA GÖMÜLÜ yapılandırma KULLANILIYOR. !!!!!!!!!!");
console.log("!!!!!!!!!! Kullanılan Firebase Yapılandırması (API Anahtarı gizlendi):", { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? "LOGGED_BUT_HIDDEN" : "MISSING_API_KEY_IN_CONFIG" });

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  console.log("[FirebaseLib] trying to initialize Firebase services...");
  if (getApps().length === 0) {
    console.log("[FirebaseLib] No Firebase apps initialized. Calling initializeApp...");
    app = initializeApp(firebaseConfig);
    console.log("[FirebaseLib] initializeApp successful. App object:", app ? "OK" : "FAILED");
  } else {
    app = getApp();
    console.log("[FirebaseLib] Firebase app already exists. Got app instance. App object:", app ? "OK" : "FAILED");
  }

  console.log("[FirebaseLib] Attempting to get Auth service...");
  auth = getAuth(app);
  console.log("[FirebaseLib] getAuth successful. Auth object:", auth ? "OK" : "FAILED");

  console.log("[FirebaseLib] Attempting to get Firestore service...");
  db = getFirestore(app);
  console.log("[FirebaseLib] getFirestore successful. Firestore object:", db ? "OK" : "FAILED");

  console.log("[FirebaseLib] Attempting to get Storage service...");
  storage = getStorage(app);
  console.log("[FirebaseLib] getStorage successful. Storage object:", storage ? "OK" : "FAILED");

  console.log("!!!!!!!!!! Firebase servisleri (Auth, Firestore, Storage) KODA GÖMÜLÜ yapılandırma ile başarıyla alındı (v4_hardcoded_detailed_logs). !!!!!!!!!!");

} catch (error: any) {
  console.error("!!!!!!!!!! FIREBASE SDK BAŞLATMA VEYA SERVİS ALMA BAŞARISIZ OLDU (KODA GÖMÜLÜ yapılandırma ile - v4_hardcoded_detailed_logs) !!!!!!!!!", error);
  console.error("!!!!!!!!!! Hata mesajı:", error.message);
  console.error("!!!!!!!!!! Hata kodu:", error.code);
  const safeConfigForLogging = { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? "LOGGED_BUT_HIDDEN" : "MISSING_API_KEY_IN_CONFIG" };
  console.error("!!!!!!!!!! Başarısız denemede kullanılan Firebase yapılandırması (API Anahtarı gizlendi - v4_hardcoded_detailed_logs):", JSON.stringify(safeConfigForLogging, null, 2));
  throw new Error(`Firebase Core Initialization Failed (v4): ${error.message}. Check console for details and hardcoded config in firebase.ts.`);
}

export { app, auth, db, storage };
