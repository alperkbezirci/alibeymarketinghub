
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// !!!!! UYARI: BU YÖNTEM GEÇİCİ BİR HATA AYIKLAMA ADIMIDIR VE GÜVENLİ DEĞİLDİR !!!!!
// Firebase yapılandırması doğrudan koda gömülmüştür.
// BU ASLA ÜRETİMDE VEYA PAYLAŞILAN KODDA KULLANILMAMALIDIR.
// Bu yalnızca Firebase Studio'daki ortam değişkeni yükleme sorununu aşmak için geçici bir çözümdür.
const firebaseConfig = {
  apiKey: "AIzaSyCQSBJ_Et7Le_kCl_LoscVyM7sc6R86jzQ",
  authDomain: "alibey-marketing-hub.firebaseapp.com",
  projectId: "alibey-marketing-hub",
  storageBucket: "alibey-marketing-hub.appspot.com",
  messagingSenderId: "666761005327",
  appId: "1:666761005327:web:81488b564f0a1a7fdd967a" // Kullanıcı tarafından sağlanan doğru App ID
};

// Konsol loglarını versiyonlamak, hangi konfigürasyonun aktif olduğunu anlamaya yardımcı olur
console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts - v3_hardcoded_config) - KODA GÖMÜLÜ yapılandırma KULLANILIYOR. BU GÜVENLİ DEĞİLDİR VE YALNIZCA GEÇİCİ BİR ÇÖZÜMDÜR. !!!!!!!!!!");
console.log("!!!!!!!!!! Kullanılan Firebase Yapılandırması (API Anahtarı gizlendi):", { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? "LOGGED_BUT_HIDDEN" : undefined });


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("!!!!!!!!!! Firebase uygulaması KODA GÖMÜLÜ yapılandırma kullanılarak başarıyla başlatıldı (v3_hardcoded_config). !!!!!!!!!!");
  } else {
    app = getApp();
    console.log("!!!!!!!!!! Firebase uygulaması zaten başlatılmış, mevcut KODA GÖMÜLÜ yapılandırma kullanılıyor (v3_hardcoded_config). !!!!!!!!!!");
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("!!!!!!!!!! Firebase servisleri (Auth, Firestore, Storage) KODA GÖMÜLÜ yapılandırma ile başarıyla alındı (v3_hardcoded_config). !!!!!!!!!!");
} catch (error: any) {
  console.error("!!!!!!!!!! FIREBASE SDK BAŞLATMA VEYA SERVİS ALMA BAŞARISIZ OLDU (KODA GÖMÜLÜ yapılandırma ile - v3_hardcoded_config)! Bu, koddaki yapılandırma değerlerinin yanlış olduğu anlamına gelebilir.", error);
  // Güvenlik için API anahtarını loglamadan önce gizle
  const safeConfigForLogging = { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? "LOGGED_BUT_HIDDEN" : undefined };
  console.error("!!!!!!!!!! Başarısız denemede kullanılan Firebase yapılandırması (API Anahtarı gizlendi - v3_hardcoded_config):", JSON.stringify(safeConfigForLogging, null, 2));
  // Hata ayıklama için orijinal hatayı fırlatmak yerine, uygulamanın çökmesini önlemek için
  // ve kullanıcıya daha anlamlı bir mesaj vermek için özel bir hata fırlatılabilir.
  // Ancak şimdilik Next.js'in kendi hata sayfasını göstermesi için orijinal hatayı fırlatıyoruz.
  throw error; // Orijinal hatayı tekrar fırlat ki Next.js yakalayabilsin
}

export { app, auth, db, storage };
