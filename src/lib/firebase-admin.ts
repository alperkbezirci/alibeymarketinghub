// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// ÖNEMLİ: Bu dosya SUNUCU TARAFINDA çalışır.
// Üretim ortamınızda Firebase Admin SDK'nın doğru şekilde başlatıldığından emin olun.
// Google Cloud ortamlarında (App Hosting, Cloud Functions, Cloud Run vb.) 
// Application Default Credentials (ADC) genellikle otomatik olarak çalışır.
// Alternatif olarak, servis hesabı JSON anahtarını güvenli bir şekilde 
// (örneğin ortam değişkeni aracılığıyla) sağlamanız gerekebilir.

if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log("Firebase Admin SDK successfully initialized (likely using Application Default Credentials).");
  } catch (e: any) {
    console.error("CRITICAL: Firebase Admin SDK initialization failed:", e.message);
    console.error("Ensure Application Default Credentials are set up in your Google Cloud environment, or provide a service account JSON key via environment variables (e.g., GOOGLE_APPLICATION_CREDENTIALS or a custom one for FIREBASE_SERVICE_ACCOUNT_KEY_JSON). Without Admin SDK, server-side Firebase operations requiring admin privileges will fail.");
    // Üretimde, Admin SDK'nın başlatılamaması genellikle kritik bir hatadır.
    // Uygulamanın bu durumda nasıl davranacağına karar vermeniz gerekebilir (örneğin, başlatmayı durdurmak).
  }
}

export { admin };
