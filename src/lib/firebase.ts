// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// !!!!! UYARI: GEÇİCİ HATA AYIKLAMA ADIMI - ÜRETİM İÇİN GÜVENLİ DEĞİLDİR !!!!!
// Normalde, bu değerler ortam değişkenlerinden (örneğin .env.local) gelmeli
// ve kaynak kodunuza GÖMÜLMEMELİDİR.
// Kimlik bilgilerini koda gömmek bir güvenlik riskidir ve farklı
// ortamları (geliştirme, hazırlık, üretim) yönetmeyi çok zorlaştırır.

// BU YÖNTEMI HATA AYIKLAMA İÇİN KULLANIYORSANIZ, BURADAKİ DEĞERLERİN DOĞRU OLDUĞUNDAN EMİN OLUN.
// ÖZELLİKLE APP_ID YER TUTUCUSUNU DEĞİŞTİRİN.
const firebaseConfig = {
  apiKey: "AIzaSyCQSBJ_Et7Le_kCl_LoscVyM7sc6R86jzQ", // ÖNCEKİ DENEMELERDE SAĞLANAN DEĞER
  authDomain: "alibey-marketing-hub.firebaseapp.com", // ÖNCEKİ DENEMELERDE SAĞLANAN DEĞER
  projectId: "alibey-marketing-hub", // ÖNCEKİ DENEMELERDE SAĞLANAN DEĞER
  storageBucket: "alibey-marketing-hub.appspot.com", // ÖNCEKİ DENEMELERDE SAĞLANAN DEĞER
  messagingSenderId: "666761005327", // ÖNCEKİ DENEMELERDE SAĞLANAN DEĞER
  // !!! ÖNEMLİ: AŞAĞIDAKİ "appId" İÇİN YER TUTUCUYU GERÇEK FIREBASE UYGULAMA KİMLİĞİNİZİN BENZERSİZ KARMA (HASH) BÖLÜMÜYLE DEĞİŞTİRİN !!!
  // Firebase Konsolu -> Proje Ayarları -> Genel -> Uygulamalarınız -> Web Uygulamanız -> appId (örn: 1:XXXXXXXXXXXX:web:YYYYYYYYYYYYYYYYYYYYYYYY)
  // Buraya YYYYYYYYYYYYYYYYYYYYYYYY kısmını girmeniz veya tam appId'yi tırnak içinde girmeniz gerekebilir.
  // Emin olmak için tam formatı "1:PROJECT_NUMBER:web:UNIQUE_HASH" şeklinde girin.
  appId: "1:666761005327:web:REPLACE_THIS_WITH_THE_UNIQUE_HASH_FROM_YOUR_FIREBASE_APP_ID"
};

// appId içindeki yer tutucu için temel kontrol
if (firebaseConfig.appId.includes("REPLACE_THIS_WITH_THE_UNIQUE_HASH")) {
  const placeholderErrorMsg = `Firebase Başlatma Durduruldu: src/lib/firebase.ts içindeki firebaseConfig objesindeki 'appId' değeri hala bir yer tutucu içeriyor ('${firebaseConfig.appId}'). Bu yer tutucuyu GERÇEK Firebase Web Uygulama Kimliğinizin benzersiz karma (hash) bölümüyle DEĞİŞTİRMELİSİNİZ.`;
  console.error("!!!!!!!!!! " + placeholderErrorMsg.toUpperCase() + " !!!!!!!!!!!");
  throw new Error(placeholderErrorMsg);
}

// Koda gömülü tüm değerlerin mevcut olup olmadığını kontrol et (temel kontrol)
let missingHardcodedValue = false;
let missingKeysMessage = '';
for (const key in firebaseConfig) {
  if (!firebaseConfig[key as keyof typeof firebaseConfig]) {
    missingHardcodedValue = true;
    missingKeysMessage += `${key} koda gömülü yapılandırmada eksik. `;
  }
}

if (missingHardcodedValue) {
  const hardcodedConfigError = `Firebase Başlatma Durduruldu: src/lib/firebase.ts içindeki koda gömülü firebaseConfig'de bir veya daha fazla değer eksik: ${missingKeysMessage}. Lütfen bu geçici hata ayıklama adımı için tüm Firebase yapılandırma değerlerinin doğru şekilde koda gömüldüğünden emin olun.`;
  console.error("!!!!!!!!!! " + hardcodedConfigError.toUpperCase() + " !!!!!!!!!!!");
  throw new Error(hardcodedConfigError);
}

console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - Firebase'i KODA GÖMÜLÜ kimlik bilgileriyle başlatma deneniyor. BU SADECE HATA AYIKLAMA AMAÇLIDIR VE ÜRETİM İÇİN GÜVENLİ DEĞİLDİR. !!!!!!!!!!!");
// API anahtarını loglarken gizle
console.log("!!!!!!!!!! Kullanılan Koda Gömülü Firebase Yapılandırması:", JSON.stringify(firebaseConfig, (key, value) => key === 'apiKey' ? "LOGDA_GİZLENDİ" : value, 2));


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("!!!!!!!!!! Firebase uygulaması KODA GÖMÜLÜ yapılandırma kullanılarak başarıyla başlatıldı (initializeApp). !!!!!!!!!!");
  } else {
    app = getApp();
    console.log("!!!!!!!!!! Firebase uygulaması zaten başlatılmış (getApp), KODA GÖMÜLÜ yapılandırma kullanılıyor. !!!!!!!!!!");
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("!!!!!!!!!! Firebase servisleri (Auth, Firestore, Storage) KODA GÖMÜLÜ yapılandırma kullanılarak başarıyla alındı. !!!!!!!!!!");
  console.log("!!!!!!!!!! HATIRLATMA: Üretim veya paylaşılan herhangi bir ortam için ortam değişkenlerini (.env.local) kullanmaya geri dönün. !!!!!!!!!!!");
} catch (error: any) {
  console.error("!!!!!!!!!! FIREBASE SDK BAŞLATMA VEYA SERVİS ALMA BAŞARISIZ OLDU (koda gömülü yapılandırmayla bile) !!!!!!!!!!! Bu genellikle sağlanan yapılandırma değerlerinin (koda gömülü olsalar bile) Firebase projeniz için yanlış olduğu VEYA API anahtarının kullanımını engelleyen kısıtlamaları olduğu anlamına gelir.", error);
  console.error("!!!!!!!!!! Başarısız deneme sırasında kullanılan Firebase yapılandırması (API Anahtarı bu logda gizlendi):", JSON.stringify(firebaseConfig, (key, value) => key === 'apiKey' ? "LOGDA_GİZLENDİ" : value, 2));
  throw error; // Orijinal Firebase SDK hatasını yeniden fırlat
}

export { app, auth, db, storage };
