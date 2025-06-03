// src/services/invoice-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing invoices.
 */
import { db, storage as clientStorage } from '@/lib/firebase'; // clientStorage for potential client-side URL generation if needed, not for upload here
import { admin } from '@/lib/firebase-admin';
import { collection, getDocs, addDoc, serverTimestamp, Timestamp, query, orderBy, doc, updateDoc, getDoc as getFirestoreDoc, deleteDoc } from 'firebase/firestore';
import { deleteTask } from './task-service'; // Import deleteTask

// Helper to safely convert Firestore Timestamps or Dates to ISO strings
const convertToISOString = (dateField: Timestamp | Date | string | undefined | null): string | undefined => {
  if (!dateField) return undefined;
  if (dateField instanceof Timestamp) return dateField.toDate().toISOString();
  if (dateField instanceof Date) return dateField.toISOString();
  try {
    return new Date(dateField).toISOString();
  } catch (e) {
    console.warn("Could not convert date field to ISO string:", dateField);
    return typeof dateField === 'string' ? dateField : undefined;
  }
};


export interface Invoice {
  id: string; // Firestore document ID
  invoiceNumber: string;
  invoiceDate: string; // ISO String
  hotel: string;
  spendingCategoryName: string;
  companyName: string;
  originalAmount: number;
  originalCurrency: string;
  description?: string;
  fileURL?: string;      // URL to access the file
  storagePath?: string;  // Path in Firebase Storage
  amountInEur?: number; // Calculated amount in EUR
  exchangeRateToEur?: number | null; // Rate used for conversion to EUR (1 original currency = X EUR)
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  turqualityApplicable?: boolean;
  turqualityTaskId?: string;
}

// This is the data structure the service expects for adding/updating.
// The client-side form might have a File object, but that's handled before calling the service.
export interface InvoiceInputDataForService {
  invoiceNumber: string;
  invoiceDate: Date; // Expect Date from form, will be converted to Timestamp
  hotel: string;
  spendingCategoryName: string;
  companyName: string;
  originalAmount: number;
  originalCurrency: string;
  description?: string;
  amountInEur: number;
  exchangeRateToEur?: number | null;
  fileURL?: string;      // Optional: URL if file is already uploaded
  storagePath?: string;  // Optional: Storage path if file is already uploaded
}

const INVOICES_COLLECTION = 'invoices';
const STORAGE_BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'alibey-marketing-hub.appspot.com';


export async function addInvoice(invoiceData: InvoiceInputDataForService): Promise<Invoice> {
  try {
    if (!invoiceData.invoiceNumber || !invoiceData.invoiceDate || !invoiceData.companyName || !invoiceData.spendingCategoryName) {
      throw new Error("Fatura numarası, tarih, şirket adı ve kategori zorunludur.");
    }
    if (invoiceData.originalAmount <= 0) {
        throw new Error("Fatura tutarı 0'dan büyük olmalıdır.");
    }
     if (invoiceData.amountInEur <= 0 && invoiceData.originalCurrency !== 'EUR') {
        console.warn("Calculated EUR amount is zero or negative for non-EUR currency. Original:", invoiceData.originalAmount, invoiceData.originalCurrency);
    }

    const dataToSave = {
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: Timestamp.fromDate(invoiceData.invoiceDate),
      hotel: invoiceData.hotel,
      spendingCategoryName: invoiceData.spendingCategoryName,
      companyName: invoiceData.companyName,
      originalAmount: invoiceData.originalAmount,
      originalCurrency: invoiceData.originalCurrency,
      description: invoiceData.description || '',
      fileURL: invoiceData.fileURL || null,
      storagePath: invoiceData.storagePath || null,
      amountInEur: invoiceData.amountInEur,
      exchangeRateToEur: invoiceData.exchangeRateToEur === undefined ? null : invoiceData.exchangeRateToEur,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), dataToSave);
    const newDocSnap = await getFirestoreDoc(doc(db, INVOICES_COLLECTION, docRef.id));
    const savedData = newDocSnap.data();

    return {
      id: docRef.id,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate.toISOString(),
      hotel: invoiceData.hotel,
      spendingCategoryName: invoiceData.spendingCategoryName,
      companyName: invoiceData.companyName,
      originalAmount: invoiceData.originalAmount,
      originalCurrency: invoiceData.originalCurrency,
      description: invoiceData.description,
      fileURL: savedData?.fileURL,
      storagePath: savedData?.storagePath,
      amountInEur: invoiceData.amountInEur,
      exchangeRateToEur: invoiceData.exchangeRateToEur === undefined ? null : invoiceData.exchangeRateToEur,
      createdAt: convertToISOString(savedData?.createdAt) || new Date().toISOString(),
      updatedAt: convertToISOString(savedData?.updatedAt) || new Date().toISOString(),
      turqualityApplicable: savedData?.turqualityApplicable,
      turqualityTaskId: savedData?.turqualityTaskId,
    };
  } catch (error: any) {
    console.error("Error adding invoice: ", error);
    throw new Error(error.message || "Fatura eklenirken bir hata oluştu.");
  }
}

export async function linkTaskToInvoice(invoiceId: string, turqualityTaskId: string): Promise<void> {
  if (!invoiceId || !turqualityTaskId) {
    throw new Error("Fatura ID ve Görev ID, ilişkilendirme için zorunludur.");
  }
  try {
    const invoiceDocRef = doc(db, INVOICES_COLLECTION, invoiceId);
    await updateDoc(invoiceDocRef, {
      turqualityTaskId: turqualityTaskId,
      turqualityApplicable: true,
      updatedAt: serverTimestamp()
    });
    console.log(`Task ${turqualityTaskId} successfully linked to invoice ${invoiceId}.`);
  } catch (error: any) {
    console.error(`Error linking task ${turqualityTaskId} to invoice ${invoiceId}: `, error);
    throw new Error(`Görev faturaya bağlanırken bir hata oluştu: ${error.message}`);
  }
}


export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const invoicesCollection = collection(db, INVOICES_COLLECTION);
    const q = query(invoicesCollection, orderBy('invoiceDate', 'desc'));
    const invoiceSnapshot = await getDocs(q);
    const invoiceList = invoiceSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: convertToISOString(data.invoiceDate)!,
        hotel: data.hotel,
        spendingCategoryName: data.spendingCategoryName,
        companyName: data.companyName,
        originalAmount: data.originalAmount,
        originalCurrency: data.originalCurrency,
        description: data.description,
        fileURL: data.fileURL,
        storagePath: data.storagePath,
        amountInEur: data.amountInEur,
        exchangeRateToEur: data.exchangeRateToEur,
        createdAt: convertToISOString(data.createdAt)!,
        updatedAt: convertToISOString(data.updatedAt)!,
        turqualityApplicable: data.turqualityApplicable,
        turqualityTaskId: data.turqualityTaskId,
      } as Invoice;
    });
    return invoiceList;
  } catch (error: any) {
    console.error("Error fetching all invoices: ", error);
    let userMessage = "Tüm faturalar alınırken bir hata oluştu.";
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
        userMessage += " Lütfen Firestore için gerekli index'in oluşturulduğundan emin olun. Hata mesajında index oluşturma linki olabilir.";
    }
    throw new Error(userMessage);
  }
}

export async function updateInvoice(id: string, updates: Partial<Omit<Invoice, 'id' | 'createdAt'>>): Promise<void> {
  const invoiceDoc = doc(db, INVOICES_COLLECTION, id);
  const dataToUpdate: any = { ...updates, updatedAt: serverTimestamp() };
  if (updates.invoiceDate && typeof updates.invoiceDate === 'string') {
    dataToUpdate.invoiceDate = Timestamp.fromDate(new Date(updates.invoiceDate));
  } else if (updates.invoiceDate && updates.invoiceDate instanceof Date) { 
    dataToUpdate.invoiceDate = Timestamp.fromDate(updates.invoiceDate);
  }
  if (updates.fileURL === undefined && updates.storagePath === undefined) {
    // If only one is undefined, we might want to clear both or handle specifically.
    // For now, if filePath (old logic) was being cleared, we clear new fields too.
  }
  if (updates.exchangeRateToEur === undefined) {
    dataToUpdate.exchangeRateToEur = null;
  }
  if (updates.turqualityApplicable === false) {
    dataToUpdate.turqualityTaskId = null;
  }
  await updateDoc(invoiceDoc, dataToUpdate);
}

export async function deleteInvoice(id: string): Promise<void> {
  if (!id) {
    throw new Error("Fatura ID'si silme işlemi için zorunludur.");
  }
  const invoiceDocRef = doc(db, INVOICES_COLLECTION, id);
  try {
    const invoiceSnap = await getFirestoreDoc(invoiceDocRef);

    if (invoiceSnap.exists()) {
      const invoiceData = invoiceSnap.data() as Invoice;
      
      // Delete associated task first
      if (invoiceData.turqualityTaskId) {
        try {
          await deleteTask(invoiceData.turqualityTaskId);
          console.log(`Associated task ${invoiceData.turqualityTaskId} for invoice ${id} deleted.`);
        } catch (taskDeleteError: any) {
          console.error(`Failed to delete associated task ${invoiceData.turqualityTaskId} for invoice ${id}:`, taskDeleteError);
        }
      }

      // Delete file from Firebase Storage if storagePath exists
      if (invoiceData.storagePath) {
        try {
          if (!admin.apps.length) {
            console.warn("Firebase Admin SDK not initialized. Cannot delete file from Storage for invoice:", id);
          } else {
            const bucket = admin.storage().bucket(STORAGE_BUCKET_NAME);
            await bucket.file(invoiceData.storagePath).delete();
            console.log(`File ${invoiceData.storagePath} for invoice ${id} deleted from Firebase Storage.`);
          }
        } catch (storageError: any) {
          console.error(`Failed to delete file ${invoiceData.storagePath} from Storage for invoice ${id}:`, storageError);
          // Decide if you want to stop invoice deletion if file deletion fails.
          // For now, we'll log and continue.
        }
      }
    } else {
      console.warn(`Invoice ${id} not found during deletion, cannot check for associated task or file.`);
    }

    // Delete the invoice document from Firestore
    await deleteDoc(invoiceDocRef);
    console.log(`Invoice with ID: ${id} successfully deleted from Firestore.`);
  } catch (error: any) {
    console.error(`Error deleting invoice with ID ${id}: `, error);
    throw new Error(`Fatura (ID: ${id}) silinirken bir hata oluştu: ${error.message || 'Bilinmeyen sunucu hatası'}`);
  }
}
