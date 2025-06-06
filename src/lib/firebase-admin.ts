
// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

let adminInitialized = false;
let adminInitializationError: string | null = null;

console.log("================ [Admin SDK] Initialization Attempt Start ================");
console.log("[Admin SDK] Node.js version:", process.version);
console.log("[Admin SDK] Initial admin.apps.length:", admin.apps.length);

// Log relevant environment variables
console.log("[Admin SDK] Env: GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS || "Not Set");
console.log("[Admin SDK] Env: GOOGLE_CLOUD_PROJECT (or GCLOUD_PROJECT):", process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "Not Set");
const firebaseConfigEnv = process.env.FIREBASE_CONFIG;
console.log("[Admin SDK] Env: FIREBASE_CONFIG:", firebaseConfigEnv ? "Set (details below)" : "Not Set");

let projectIdFromEnvConfig: string | undefined;
if (firebaseConfigEnv) {
  try {
    const parsedConfig = JSON.parse(firebaseConfigEnv);
    projectIdFromEnvConfig = parsedConfig.projectId;
    console.log("[Admin SDK] Parsed projectId from FIREBASE_CONFIG:", projectIdFromEnvConfig);
    // console.log("[Admin SDK] Full FIREBASE_CONFIG content:", firebaseConfigEnv); // Sensitive, log carefully
  } catch (parseError: any) {
    console.warn("[Admin SDK] Failed to parse FIREBASE_CONFIG:", parseError.message);
  }
}

if (admin.apps.length === 0) {
  // Attempt 1: Initialize with no arguments (recommended for GCP environments)
  try {
    console.log("[Admin SDK] Attempt 1: admin.initializeApp() with no arguments...");
    admin.initializeApp();
    adminInitialized = true;
    adminInitializationError = null;
    const app = admin.app();
    console.log("SUCCESS: [Admin SDK] Initialized successfully (no args). App Name:", app.name, "Project ID:", app.options.projectId || "Not detected in app.options (should be auto-discovered)");
  } catch (e1: any) {
    console.error("ERROR: [Admin SDK] Attempt 1 (no args) FAILED.");
    console.error("  Error Name:", e1?.name);
    console.error("  Error Message:", e1?.message);
    console.error("  Error Code:", e1?.code);
    // console.error("  Error Stack:", e1?.stack); // Can be very verbose
    adminInitializationError = `Attempt 1 (no args) failed: ${e1.message}`;

    // Determine projectId for fallback attempts
    const projectIdToTry = process.env.GOOGLE_CLOUD_PROJECT || projectIdFromEnvConfig;

    if (projectIdToTry) {
      // Attempt 2: Initialize with explicit projectId (obtained from env)
      console.log(`[Admin SDK] Attempt 2: admin.initializeApp({ projectId: "${projectIdToTry}" })`);
      try {
        admin.initializeApp({ projectId: projectIdToTry });
        adminInitialized = true;
        adminInitializationError = null; // Clear previous error
        const app = admin.app();
        console.log("SUCCESS: [Admin SDK] Initialized successfully (with explicit projectId). App Name:", app.name, "Project ID:", app.options.projectId);
      } catch (e2: any) {
        console.error(`ERROR: [Admin SDK] Attempt 2 (with projectId: "${projectIdToTry}") FAILED.`);
        console.error("  Error Name:", e2?.name);
        console.error("  Error Message:", e2?.message);
        console.error("  Error Code:", e2?.code);
        adminInitializationError = `Attempt 2 (projectId: ${projectIdToTry}) failed: ${e2.message} (Initial error: ${e1.message})`;
      }
    } else {
      console.warn("[Admin SDK] No projectId found in GOOGLE_CLOUD_PROJECT or FIREBASE_CONFIG for fallback initialization attempt.");
    }

    // Attempt 3: Initialize with explicit Application Default Credentials and projectId (if available)
    // This is more explicit and can sometimes help if auto-discovery is problematic.
    if (!adminInitialized) { // Only try if still not initialized
        console.log("[Admin SDK] Attempt 3: admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: ... })");
        try {
            const credential = admin.credential.applicationDefault();
            const initOptions: admin.AppOptions = { credential };
            if (projectIdToTry) {
                initOptions.projectId = projectIdToTry;
                console.log(`[Admin SDK] Using projectId for Attempt 3: "${projectIdToTry}"`);
            } else {
                console.warn("[Admin SDK] Attempt 3: No projectId available to explicitly set, relying on ADC to discover it.");
            }
            admin.initializeApp(initOptions);
            adminInitialized = true;
            adminInitializationError = null;
            const app = admin.app();
            console.log("SUCCESS: [Admin SDK] Initialized successfully (explicit ADC). App Name:", app.name, "Project ID:", app.options.projectId || "Not detected (ADC should provide)");
        } catch (e3: any) {
            console.error("ERROR: [Admin SDK] Attempt 3 (explicit ADC) FAILED.");
            console.error("  Error Name:", e3?.name);
            console.error("  Error Message:", e3?.message);
            console.error("  Error Code:", e3?.code);
            adminInitializationError = `Attempt 3 (explicit ADC) failed: ${e3.message} (Previous errors: ${adminInitializationError})`;
        }
    }

    if (!adminInitialized) {
      console.error("CRITICAL: [Admin SDK] All Firebase Admin SDK initialization attempts FAILED.");
      console.error("  Final recorded initialization error:", adminInitializationError);
      console.error("  Please ensure Application Default Credentials (ADC) are correctly set up for your Firebase App Hosting environment, and the runtime service account has necessary IAM permissions (e.g., Firebase Admin SDK Administrator Service Agent, Cloud Datastore User, Storage Object Admin).");
    }
  }
} else {
  adminInitialized = true;
  adminInitializationError = null; // Should be null if already initialized
  console.log("[Admin SDK] Already initialized. Using existing instance. App Name:", admin.app().name, "Project ID:", admin.app().options.projectId || "Not detected in app.options");
}

console.log("[Admin SDK] Initialization Final Status - adminInitialized:", adminInitialized);
if (adminInitializationError) {
  console.log("[Admin SDK] Initialization Final Error Message to be exported:", adminInitializationError);
}
console.log("================ [Admin SDK] Initialization Attempt End ================");

export { admin, adminInitialized, adminInitializationError };
