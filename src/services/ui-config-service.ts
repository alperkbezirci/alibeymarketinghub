// src/services/ui-config-service.ts
'use server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface UiSettings {
  mainTitle: string;
  logoUrl: string;
}

const UI_CONFIG_COLLECTION = 'uiConfiguration';
const GLOBAL_SETTINGS_DOC_ID = 'globalSettings';

const DEFAULT_UI_SETTINGS: UiSettings = {
  mainTitle: 'Ali Bey Marketing Hub',
  logoUrl: 'https://placehold.co/150x50.png?text=LOGO',
};

export async function saveUiSettings(settings: UiSettings): Promise<void> {
  try {
    const docRef = doc(db, UI_CONFIG_COLLECTION, GLOBAL_SETTINGS_DOC_ID);
    // Ensure only known fields are saved and add timestamp
    const dataToSave = {
        mainTitle: settings.mainTitle || DEFAULT_UI_SETTINGS.mainTitle,
        logoUrl: settings.logoUrl || DEFAULT_UI_SETTINGS.logoUrl,
        updatedAt: serverTimestamp()
    };
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (error) {
    console.error("Error saving UI settings: ", error);
    throw new Error("Arayüz ayarları kaydedilirken bir hata oluştu.");
  }
}

export async function getUiSettings(): Promise<UiSettings> {
  try {
    const docRef = doc(db, UI_CONFIG_COLLECTION, GLOBAL_SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Ensure defaults are provided if fields are missing from Firestore
      return {
        mainTitle: data.mainTitle || DEFAULT_UI_SETTINGS.mainTitle,
        logoUrl: data.logoUrl || DEFAULT_UI_SETTINGS.logoUrl,
      };
    } else {
      // If no settings exist, save and return defaults to initialize the document
      await setDoc(docRef, { ...DEFAULT_UI_SETTINGS, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return DEFAULT_UI_SETTINGS;
    }
  } catch (error) {
    console.error("Error fetching UI settings: ", error);
    // Return defaults in case of error to allow app to function gracefully
    return DEFAULT_UI_SETTINGS;
  }
}
