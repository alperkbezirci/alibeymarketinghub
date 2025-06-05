// src/lib/firebase-admin.ts
import * as admin from 'firebase-admin';

let adminInitialized = false;
let adminInitializationError: string | null = null;

if (!admin.apps.length) {
  try {
    // Attempt to initialize with default credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS)
    // or if specific service account JSON is provided via environment variables.
    admin.initializeApp();
    adminInitialized = true;
    console.log("Firebase Admin SDK successfully initialized (likely using Application Default Credentials or environment configuration).");
  } catch (e: any) {
    adminInitializationError = e.message || "Unknown Admin SDK initialization error";
    console.error("CRITICAL: Firebase Admin SDK initialization failed:", adminInitializationError);
    console.error("Ensure Application Default Credentials are set up correctly in your Google Cloud environment, or that a valid service account JSON key is properly configured via environment variables (e.g., GOOGLE_APPLICATION_CREDENTIALS). Without a successfully initialized Admin SDK, server-side Firebase operations requiring admin privileges (like Storage file manipulation or custom token operations) will fail.");
    adminInitialized = false;
  }
} else {
  // SDK was already initialized (e.g., by a previous import or in a different part of the server)
  adminInitialized = true;
  console.log("Firebase Admin SDK was already initialized.");
}

export { admin, adminInitialized, adminInitializationError };
