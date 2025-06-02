
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// !!!!! UYARI: BU YÖNTEM GEÇİCİ BİR HATA AYIKLAMA ADIMIDIR VE GÜVENLİ DEĞİLDİR !!!!!
// Firebase yapılandırması doğrudan koda gömülmüştür.
// BU ASLA ÜRETİMDE VEYA PAYLAŞILAN KODDA KULLANILMAMALIDIR.
// Bu yalnızca .env.local dosyasının yüklenmesiyle ilgili bir sorun olup olmadığını
// veya yapılandırma değerlerinde bir hata olup olmadığını kesin olarak anlamak için geçici bir teşhis aracıdır.
const firebaseConfig = {
  apiKey: "AIzaSyCQSBJ_Et7Le_kCl_LoscVyM7sc6R86jzQ", // Senin API Anahtarın
  authDomain: "alibey-marketing-hub.firebaseapp.com", // Senin Auth Domain'in
  projectId: "alibey-marketing-hub", // Senin Project ID'n
  storageBucket: "alibey-marketing-hub.appspot.com", // Senin Storage Bucket'ın
  messagingSenderId: "666761005327", // Senin Messaging Sender ID'n
  appId: "1:666761005327:web:81488b564f0a1a7fdd967a" // KULLANICI TARAFINDAN SAĞLANAN GERÇEK APP ID
};

console.log("!!!!!!!!!! FIREBASE DEBUG (src/lib/firebase.ts) - KODA GÖMÜLÜ Firebase yapılandırması kullanılıyor. BU SADECE HATA AYIKLAMA AMAÇLIDIR VE ÜRETİM İÇİN GÜVENLİ DEĞİLDİR. !!!!!!!!!!!");
// API anahtarını loglarken gizle
console.log("!!!!!!!!!! Kullanılan Koda Gömülü Firebase Yapılandırması:", JSON.stringify(firebaseConfig, (key, value) => key === 'apiKey' ? "LOGDA_GİZLENDİ" : value, 2));

// Koda gömülü tüm değerlerin mevcut olup olmadığını kontrol et (temel kontrol)
let missingHardcodedValue = false;
let missingKeysMessage = '';
const keysToCheck: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
for (const key of keysToCheck) {
  if (!firebaseConfig[key]) {
    missingHardcodedValue = true;
    missingKeysMessage += `${key} koda gömülü yapılandırmada eksik. `;
  }
}

if (missingHardcodedValue) {
  const hardcodedConfigError = `Firebase Başlatma Durduruldu: src/lib/firebase.ts içindeki koda gömülü firebaseConfig'de bir veya daha fazla değer eksik: ${missingKeysMessage}. Lütfen bu geçici hata ayıklama adımı için tüm Firebase yapılandırma değerlerinin doğru şekilde koda gömüldüğünden emin olun.`;
  console.error("!!!!!!!!!! " + hardcodedConfigError.toUpperCase() + " !!!!!!!!!!!");
  throw new Error(hardcodedConfigError);
}

// appId içindeki genel yer tutucu kalıbını kontrol et (daha önce kullandığımız bir tanesi)
const PLACEHOLDER_APP_ID_PATTERN = "YOUR_APP_ID_HASH_GOES_HERE_REPLACE_ME";
if (firebaseConfig.appId.includes(PLACEHOLDER_APP_ID_PATTERN)) {
    const placeholderErrorMsg = `Firebase Başlatma Durduruldu: src/lib/firebase.ts içindeki firebaseConfig objesindeki 'appId' değeri hala bir yer tutucu içeriyor ('${firebaseConfig.appId}'). Bu yer tutucuyu ('${PLACEHOLDER_APP_ID_PATTERN}') GERÇEK Firebase Web Uygulama Kimliğinizin benzersiz karma (hash) bölümüyle DEĞİŞTİRMELİSİNİZ.`;
    console.error("!!!!!!!!!! " + placeholderErrorMsg.toUpperCase() + " !!!!!!!!!!!");
    throw new Error(placeholderErrorMsg);
}


console.log("!!!!!!!!!! Koda gömülü Firebase yapılandırma kontrolleri GEÇİLDİ. Firebase başlatılmaya çalışılıyor... !!!!!!!!!!");

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
  console.log("!!!!!!!!!! HATIRLATMA: Bu geçici bir çözümdür. Güvenlik ve yönetilebilirlik için en kısa zamanda ortam değişkenlerini (.env.local veya platforma özel yöntemler) kullanmaya geri dönün. !!!!!!!!!!!");
} catch (error: any) {
  console.error("!!!!!!!!!! FIREBASE SDK BAŞLATMA VEYA SERVİS ALMA BAŞARISIZ OLDU (koda gömülü yapılandırmayla bile) !!!!!!!!!!! Bu genellikle sağlanan yapılandırma değerlerinin (koda gömülü olsalar bile) Firebase projeniz için yanlış olduğu VEYA API anahtarının kullanımını engelleyen kısıtlamaları olduğu anlamına gelir.", error);
  console.error("!!!!!!!!!! Başarısız deneme sırasında kullanılan Firebase yapılandırması (API Anahtarı bu logda gizlendi):", JSON.stringify(firebaseConfig, (key, value) => key === 'apiKey' ? "LOGDA_GİZLENDİ" : value, 2));
  throw error; // Orijinal Firebase SDK hatasını yeniden fırlat
}

export { app, auth, db, storage };
