
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const FIREBASE_CONFIG_VERSION = "v6_hardcoded_again"; // Yeni versiyon etiketi

console.log(`!!!!!!!!!! FIREBASE DEBUG (${FIREBASE_CONFIG_VERSION} - src/lib/firebase.ts) - KODA GÖMÜLÜ yapılandırma KULLANILIYOR. BU GÜVENLİ DEĞİLDİR VE YALNIZCA GEÇİCİ BİR ÇÖZÜMDÜR. !!!!!!!!!!`);

// Firebase yapılandırma bilgilerinizi doğrudan buraya girin:
const firebaseConfig = {
  apiKey: "AIzaSyCQSBJ_Et7Le_kCl_LoscVyM7sc6R86jzQ",
  authDomain: "alibey-marketing-hub.firebaseapp.com",
  projectId: "alibey-marketing-hub",
  storageBucket: "alibey-marketing-hub.appspot.com",
  messagingSenderId: "666761005327",
  appId: "1:666761005327:web:81488b564f0a1a7fdd967a",
};

console.log(`!!!!!!!!!! Kullanılan Firebase Yapılandırması (${FIREBASE_CONFIG_VERSION} - API Anahtarı gizlendi):`, { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? "LOGGED_BUT_HIDDEN" : "MISSING_API_KEY_IN_CONFIG_OBJECT" });

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase servisleri başlatılmaya çalışılıyor...`);
  if (getApps().length === 0) {
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Hiç Firebase uygulaması başlatılmamış. initializeApp çağrılıyor...`);
    app = initializeApp(firebaseConfig);
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] initializeApp başarılı. App nesnesi:`, app ? "OK" : "FAILED");
  } else {
    app = getApp();
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase uygulaması zaten mevcut. App örneği alındı. App nesnesi:`, app ? "OK" : "FAILED");
  }

  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Auth servisi alınmaya çalışılıyor...`);
  auth = getAuth(app);
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] getAuth başarılı. Auth nesnesi:`, auth ? "OK" : "FAILED");

  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firestore servisi alınmaya çalışılıyor...`);
  db = getFirestore(app);
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] getFirestore başarılı. Firestore nesnesi:`, db ? "OK" : "FAILED");

  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Storage servisi alınmaya çalışılıyor...`);
  storage = getStorage(app);
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] getStorage başarılı. Storage nesnesi:`, storage ? "OK" : "FAILED");

  console.log(`!!!!!!!!!! Firebase servisleri (Auth, Firestore, Storage) KODA GÖMÜLÜ yapılandırma ile başarıyla alındı (${FIREBASE_CONFIG_VERSION}). !!!!!!!!!!`);

} catch (error: any) {
  console.error(`!!!!!!!!!! FIREBASE SDK BAŞLATMA VEYA SERVİS ALMA BAŞARISIZ OLDU (KODA GÖMÜLÜ - ${FIREBASE_CONFIG_VERSION}) !!!!!!!!!`, error);
  console.error("!!!!!!!!!! Hata mesajı:", error.message);
  console.error("!!!!!!!!!! Hata kodu:", error.code);
  const safeConfigForLogging = { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? "LOGGED_BUT_HIDDEN" : "MISSING_API_KEY_IN_CONFIG_OBJECT" };
  console.error(`!!!!!!!!!! Başarısız denemede kullanılan Firebase yapılandırması (API Anahtarı gizlendi - ${FIREBASE_CONFIG_VERSION}):`, JSON.stringify(safeConfigForLogging, null, 2));
  throw new Error(`Firebase Core Initialization Failed (${FIREBASE_CONFIG_VERSION}): ${error.message}. Check console for details and hardcoded config in src/lib/firebase.ts.`);
}

export { app, auth, db, storage };

    