// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

let adminInitialized = false;
let adminInitializationError: string | null = null;

console.log("================ Firebase Admin SDK Initialization Start ================");
console.log("Node.js version:", process.version);
console.log("Initial admin.apps.length:", admin.apps.length);

// Log relevant environment variables that Admin SDK might use
console.log("Env: GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS || "Not Set");
console.log("Env: GOOGLE_CLOUD_PROJECT (or GCLOUD_PROJECT):", process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "Not Set");
console.log("Env: FIREBASE_CONFIG:", process.env.FIREBASE_CONFIG || "Not Set");

if (admin.apps.length === 0) {
  try {
    console.log("Attempting admin.initializeApp() with no arguments (recommended for GCP environments)...");
    // For GCP environments (like Firebase App Hosting, Cloud Run, Cloud Functions),
    // initializeApp() with no arguments should use Application Default Credentials
    // and discover projectId from the environment (e.g., from FIREBASE_CONFIG or GOOGLE_CLOUD_PROJECT).
    admin.initializeApp();
    adminInitialized = true;
    const app = admin.app();
    console.log("SUCCESS: Firebase Admin SDK initialized successfully via default method.");
    console.log("Initialized App Name:", app.name);
    console.log("Initialized App Project ID:", app.options.projectId || "Not detected in app.options (expected from env)");
  } catch (e1: any) {
    console.error("ERROR: admin.initializeApp() with no arguments FAILED.");
    console.error("Initial Error Name:", e1?.name);
    console.error("Initial Error Message:", e1?.message);
    console.error("Initial Error Code:", e1?.code);
    console.error("Initial Error Stack:", e1?.stack);
    adminInitializationError = `Initial init failed: ${e1.message}`;

    // Fallback attempt: Try with explicit projectId if available from environment variables
    const projectIdFromEnvConfig = process.env.FIREBASE_CONFIG
      ? (() => {
          try {
            return JSON.parse(process.env.FIREBASE_CONFIG!).projectId;
          } catch {
            return undefined;
          }
        })()
      : undefined;
      
    const projectIdToTry = process.env.GOOGLE_CLOUD_PROJECT || projectIdFromEnvConfig;

    if (projectIdToTry) {
      console.log(`Attempting fallback init: admin.initializeApp({ projectId: "${projectIdToTry}" })`);
      try {
        admin.initializeApp({ projectId: projectIdToTry });
        adminInitialized = true; // Mark as initialized if fallback succeeds
        const app = admin.app();
        console.log("SUCCESS: Firebase Admin SDK initialized successfully with explicit projectId on fallback.");
        console.log("Initialized App Name (fallback):", app.name);
        console.log("Initialized App Project ID (fallback):", app.options.projectId);
        adminInitializationError = null; // Clear previous error if fallback succeeds
      } catch (e2: any) {
        console.error(`ERROR: admin.initializeApp({ projectId: "${projectIdToTry}" }) FAILED.`);
        console.error("Fallback Error Name:", e2?.name);
        console.error("Fallback Error Message:", e2?.message);
        console.error("Fallback Error Code:", e2?.code);
        console.error("Fallback Error Stack:", e2?.stack);
        // Keep the more specific error from the fallback if it occurs, or retain the initial one
        adminInitializationError = `Fallback init failed: ${e2.message} (Initial error: ${e1.message})`;
      }
    } else {
      console.warn("No projectId found in GOOGLE_CLOUD_PROJECT or FIREBASE_CONFIG for fallback initialization.");
      // adminInitializationError is already set from the first attempt
    }

    if (!adminInitialized) {
        console.error("CRITICAL: All Firebase Admin SDK initialization attempts FAILED.");
        console.error("Final Initialization Error recorded:", adminInitializationError);
        console.error("Please ensure Application Default Credentials (ADC) are correctly set up for your Firebase App Hosting environment, and the runtime service account has necessary IAM permissions (e.g., Firebase Admin SDK Administrator Service Agent, Cloud Datastore User, Storage Object Admin).");
    }
  }
} else {
  adminInitialized = true;
  console.log("Firebase Admin SDK was already initialized. Using existing instance.");
  const app = admin.app();
  console.log("Existing App Name:", app.name);
  console.log("Existing App Project ID:", app.options.projectId || "Not detected in app.options");
}

console.log("Admin SDK Initialized Flag after all attempts:", adminInitialized);
if (adminInitializationError && !adminInitialized) {
  console.log("Final Admin SDK Initialization Error Message to be exported:", adminInitializationError);
}
console.log("================ Firebase Admin SDK Initialization End ================");

export { admin, adminInitialized, adminInitializationError };
