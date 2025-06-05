// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

let adminInitialized = false;
let adminInitializationError: string | null = null;

const firebaseConfigEnv = process.env.FIREBASE_CONFIG;
let projectIdFromEnv: string | undefined;

if (firebaseConfigEnv) {
  try {
    const parsedConfig = JSON.parse(firebaseConfigEnv);
    projectIdFromEnv = parsedConfig.projectId;
  } catch (parseError: any) {
    console.warn("[Admin SDK] Could not parse FIREBASE_CONFIG env variable:", parseError.message);
  }
} else {
  console.warn("[Admin SDK] FIREBASE_CONFIG environment variable is not set.");
}

if (!admin.apps.length) {
  try {
    const initOptions: admin.AppOptions = {};
    
    // Google Cloud ortamlarında (App Hosting, Cloud Run, Cloud Functions vb.)
    // GOOGLE_APPLICATION_CREDENTIALS veya proje ID'si genellikle otomatik olarak ayarlanır.
    // Ancak, projectIdFromEnv'yi kullanarak açıkça belirtmek bazen yardımcı olabilir.
    if (projectIdFromEnv) {
      initOptions.projectId = projectIdFromEnv;
      console.log(`[Admin SDK] Attempting initialization with explicit projectId: ${projectIdFromEnv}`);
    } else {
      console.log("[Admin SDK] Attempting initialization with default project discovery (projectId not found in FIREBASE_CONFIG).");
    }

    // Application Default Credentials'ı açıkça kullanmayı dene
    try {
      initOptions.credential = admin.credential.applicationDefault();
      console.log("[Admin SDK] Using admin.credential.applicationDefault() for credentials.");
    } catch (credError: any) {
      console.warn(`[Admin SDK] Failed to get admin.credential.applicationDefault(). This might be okay if initializeApp() can find credentials another way. Error: ${credError.message}`);
      // Eğer bu başarısız olursa, initializeApp()'ın varsayılan credential bulma mekanizmasına güvenmeye devam et.
      // initOptions.credential set edilmemiş olacak ve initializeApp kendi başına deneyecek.
    }
    
    admin.initializeApp(initOptions);
    adminInitialized = true;
    console.log(`[Admin SDK] Firebase Admin SDK successfully initialized. Project ID used for init: ${admin.app().options.projectId || 'Default'}`);
  } catch (e: any) {
    adminInitializationError = e.message || "Unknown Admin SDK initialization error";
    console.error("CRITICAL: Firebase Admin SDK initialization failed:", adminInitializationError);
    if (e.stack) {
        console.error("[Admin SDK] Initialization Stack Trace:", e.stack);
    }
    console.error("[Admin SDK] Ensure Application Default Credentials (ADC) are set up correctly for your Firebase App Hosting environment. The runtime service account needs appropriate permissions. Project ID detected from FIREBASE_CONFIG (if any):", projectIdFromEnv);
    console.error("[Admin SDK] Without a successfully initialized Admin SDK, server-side Firebase operations requiring admin privileges will fail.");
    adminInitialized = false;
  }
} else {
  adminInitialized = true;
  console.log("[Admin SDK] Firebase Admin SDK was already initialized in a previous import.");
}

export { admin, adminInitialized, adminInitializationError };
