
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const FIREBASE_CONFIG_VERSION = "v8_hardcoded_again"; 

// !!!!!!!!!! GEÇİCİ ÇÖZÜM: Firebase yapılandırması doğrudan koda gömüldü !!!!!!!!!!
// Firebase Studio'daki ortam değişkeni yükleme sorunları nedeniyle bu yöntem kullanılıyor.
// UZUN VADEDE BU GÜVENLİ DEĞİLDİR. API anahtarlarınızı ve diğer hassas bilgileri
// .env.local veya platformun ortam değişkeni yönetimi aracılığıyla sağlamalısınız.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // GERÇEK API ANAHTARINIZI BURAYA GİRİN
  authDomain: "YOUR_AUTH_DOMAIN", // GERÇEK AUTH DOMAIN'İNİZİ BURAYA GİRİN
  projectId: "YOUR_PROJECT_ID", // GERÇEK PROJE ID'NİZİ BURAYA GİRİN
  storageBucket: "YOUR_STORAGE_BUCKET", // GERÇEK STORAGE BUCKET'INIZI BURAYA GİRİN
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // GERÇEK MESSAGING SENDER ID'NİZİ BURAYA GİRİN
  appId: "1:666761005327:web:81488b564f0a1a7fdd967a", // BU APP ID DOĞRU GÖRÜNÜYOR
};
// !!!!!!!!!! YUKARIDAKİ PLACEHOLDERLARI KENDİ GERÇEK DEĞERLERİNİZLE DEĞİŞTİRDİĞİNİZDEN EMİN OLUN !!!!!!!!!!


// Yapılandırmadaki tüm anahtarların dolu olup olmadığını kontrol et
const expectedKeys = [
  "apiKey", 
  "authDomain", 
  "projectId", 
  "storageBucket", 
  "messagingSenderId", 
  "appId"
];
const missingHardcodedKeys: string[] = [];
const placeholderValuesPresent: string[] = [];

expectedKeys.forEach(key => {
  const value = firebaseConfig[key as keyof typeof firebaseConfig];
  if (!value) {
    missingHardcodedKeys.push(key);
  } else if (value.startsWith("YOUR_") || value.startsWith("GERÇEK")) {
    placeholderValuesPresent.push(key);
  }
});

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (missingHardcodedKeys.length > 0 || placeholderValuesPresent.length > 0) {
  let errorMessage = `Firebase Initialization Failed (${FIREBASE_CONFIG_VERSION}): Koda gömülü yapılandırmada eksik veya placeholder değerler var. `;
  if (missingHardcodedKeys.length > 0) {
    errorMessage += `Eksik anahtarlar: ${missingHardcodedKeys.join(", ")}. `;
  }
  if (placeholderValuesPresent.length > 0) {
    errorMessage += `Placeholder değerler: ${placeholderValuesPresent.join(", ")}. Lütfen src/lib/firebase.ts dosyasındaki değerleri gerçek Firebase proje bilgilerinizle güncelleyin.`;
  }
  console.error(`!!!!!!!!!! ${errorMessage} !!!!!!!!!!`);
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Koda Gömülü Yapılandırma Durumu:`);
  expectedKeys.forEach(key => {
    const val = firebaseConfig[key as keyof typeof firebaseConfig];
    let status = "Yüklendi";
    if (!val) status = "EKSİK";
    else if (val.startsWith("YOUR_") || val.startsWith("GERÇEK")) status = "PLACEHOLDER";
    console.log(`  ${key}: ${status}`);
  });
  throw new Error(errorMessage);
} else {
  console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Tüm Firebase yapılandırma değerleri koda gömülü olarak sağlandı. Başlatma deneniyor...`);
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Firebase uygulaması KODA GÖMÜLÜ yapılandırma kullanılarak başarıyla başlatıldı.`);
    } else {
      app = getApp();
      console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Mevcut Firebase uygulama örneği alındı (koda gömülü yapılandırma).`);
    }

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Auth, Firestore ve Storage servisleri KODA GÖMÜLÜ yapılandırma ile başarıyla alındı.`);
  } catch (error: any) {
    console.error(`!!!!!!!!!! FIREBASE SDK BAŞLATMA HATASI (${FIREBASE_CONFIG_VERSION}) - KODA GÖMÜLÜ YAPILANDIRMA KULLANILIRKEN. Hata: !!!!!!!!!!`, error);
    const detailedConfigForError = { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? "********" : "API_KEY_EKSİK" };
    console.error(`[FirebaseLib ${FIREBASE_CONFIG_VERSION}] Hata sırasında kullanılan Firebase yapılandırması (API Anahtarı gizlendi):`, JSON.stringify(detailedConfigForError, null, 2));
    throw new Error(`Firebase Core Başlatma Hatası (${FIREBASE_CONFIG_VERSION}) - Koda gömülü yapılandırma: ${error.message}. Detaylar için konsolu kontrol edin.`);
  }
}

export { app, auth, db, storage };
