// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// ÖNEMLİ: Bu dosya SUNUCU TARAFINDA çalışır.
// Gerçek bir projede, servis hesabı anahtarınızı güvenli bir şekilde yönetmeniz gerekir.
// Örneğin, Google Cloud ortamlarında (Cloud Functions, App Engine, Cloud Run vb.) 
// Firebase Admin SDK, ortamdaki servis hesabını otomatik olarak kullanabilir (Application Default Credentials).
// Veya bir servis hesabı JSON anahtarını güvenli bir şekilde (örneğin ortam değişkeni aracılığıyla) sağlayabilirsiniz.
// `process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON` (ortam değişkeni olarak ayarlanmış JSON string'i)
// veya `process.env.GOOGLE_APPLICATION_CREDENTIALS` (JSON dosyasının yolu) gibi.

if (!admin.apps.length) {
  try {
    // Google Cloud ortamında Application Default Credentials'ı kullanmayı dene
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized with Application Default Credentials.");
  } catch (e: any) {
    console.error("Firebase Admin SDK default initialization failed:", e.message);
    // Alternatif olarak, ortam değişkeninden servis hesabı anahtarını yüklemeyi deneyebilirsiniz.
    // Bu örnekte, bu kurulumu basitleştirmek için bu adımı atlıyoruz,
    // ancak gerçek bir dağıtımda bu kritik bir adımdır.
    // if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON) {
    //   try {
    //     const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON);
    //     admin.initializeApp({
    //       credential: admin.credential.cert(serviceAccount),
    //     });
    //     console.log("Firebase Admin SDK initialized with service account from env var.");
    //   } catch (parseError: any) {
    //     console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY_JSON:", parseError.message);
    //     console.error("Firebase Admin SDK could not be initialized. Ensure proper setup for server-side authentication.");
    //   }
    // } else {
    //   console.error("Firebase Admin SDK could not be initialized. Service account key not found.");
    // }
    // Hata durumunda uygulamanın çökmemesi için loglama yapıp devam ediyoruz,
    // ancak admin yetkisi gerektiren işlemler başarısız olacaktır.
     console.warn("Firebase Admin SDK could not be initialized. Ensure Application Default Credentials are set up in your Google Cloud environment, or provide a service account key.");
  }
}

export { admin };
