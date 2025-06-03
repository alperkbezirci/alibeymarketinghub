
// src/services/budget-config-service.ts
'use server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { MANAGED_BUDGET_HOTELS } from '@/lib/constants'; // Import from constants

export interface HotelBudgetLimits {
  [hotelName: string]: number; // e.g., "Ali Bey Resort Sorgun": 50000
}

const CONFIG_COLLECTION = 'budgetConfiguration';
const MAIN_LIMITS_DOC_ID = 'mainHotelLimits';

// Default values if no configuration is found in Firestore for the managed hotels
const DEFAULT_BUDGET_LIMITS: HotelBudgetLimits = MANAGED_BUDGET_HOTELS.reduce((acc, name) => {
  // Assign some arbitrary non-zero defaults for initial display if document doesn't exist
  if (name === 'Ali Bey Resort Sorgun') acc[name] = 100000;
  else if (name === 'Ali Bey Club & Park Manavgat') acc[name] = 150000;
  else if (name === 'BIJAL') acc[name] = 200000;
  else acc[name] = 0; 
  return acc;
}, {} as HotelBudgetLimits);


export async function getHotelBudgetLimits(): Promise<HotelBudgetLimits> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, MAIN_LIMITS_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const limits: HotelBudgetLimits = {};
      MANAGED_BUDGET_HOTELS.forEach(hotelName => {
        // Use fetched value if valid number, otherwise use default for that hotel, or 0
        limits[hotelName] = typeof data[hotelName] === 'number' ? data[hotelName] : (DEFAULT_BUDGET_LIMITS[hotelName] || 0);
      });
      return limits;
    } else {
      console.warn(`Budget limits document '${CONFIG_COLLECTION}/${MAIN_LIMITS_DOC_ID}' not found. Returning default limits for managed hotels.`);
      // Consider creating the document with defaults here if it's a desired first-run behavior
      // await setDoc(docRef, { ...DEFAULT_BUDGET_LIMITS, lastUpdatedAt: serverTimestamp() });
      return { ...DEFAULT_BUDGET_LIMITS }; // Return a copy of defaults
    }
  } catch (error) {
    console.error("Error fetching hotel budget limits: ", error);
    // Fallback to defaults in case of error to ensure BudgetPage can still render structure
    return { ...DEFAULT_BUDGET_LIMITS };
    // throw new Error("Otel bütçe limitleri alınırken bir hata oluştu."); // Or rethrow if preferred
  }
}

export interface BudgetConfigData {
    aliBeyResortSorgunBudget: number;
    aliBeyClubManavgatBudget: number;
    bijalBudget: number;
}

export async function saveHotelBudgetLimitsCms(limitsData: BudgetConfigData): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, MAIN_LIMITS_DOC_ID);
    
    const dataToSave: HotelBudgetLimits & { lastUpdatedAt: Timestamp | any } = {
        'Ali Bey Resort Sorgun': limitsData.aliBeyResortSorgunBudget,
        'Ali Bey Club & Park Manavgat': limitsData.aliBeyClubManavgatBudget,
        'BIJAL': limitsData.bijalBudget,
        lastUpdatedAt: serverTimestamp()
    };

    await setDoc(docRef, dataToSave, { merge: true }); // merge: true ensures other fields are not overwritten
  } catch (error) {
    console.error("Error saving hotel budget limits from CMS: ", error);
    throw new Error("Otel bütçe limitleri CMS üzerinden kaydedilirken bir hata oluştu.");
  }
}

export async function getHotelBudgetLimitsForCms(): Promise<BudgetConfigData> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, MAIN_LIMITS_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        aliBeyResortSorgunBudget: data['Ali Bey Resort Sorgun'] || 0,
        aliBeyClubManavgatBudget: data['Ali Bey Club & Park Manavgat'] || 0,
        bijalBudget: data['BIJAL'] || 0,
      };
    } else {
      // Return default values if document doesn't exist for CMS form
      return {
        aliBeyResortSorgunBudget: DEFAULT_BUDGET_LIMITS['Ali Bey Resort Sorgun'] || 0,
        aliBeyClubManavgatBudget: DEFAULT_BUDGET_LIMITS['Ali Bey Club & Park Manavgat'] || 0,
        bijalBudget: DEFAULT_BUDGET_LIMITS['BIJAL'] || 0,
      };
    }
  } catch (error) {
    console.error("Error fetching hotel budget limits for CMS: ", error);
    throw new Error("CMS için otel bütçe limitleri alınırken bir hata oluştu.");
  }
}
