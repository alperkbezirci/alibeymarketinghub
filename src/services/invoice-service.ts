
// src/services/invoice-service.ts
'use server';
/**
 * @fileOverview Firestore service for managing invoices.
 */
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp, Timestamp, query, orderBy, doc, updateDoc, getDoc as getFirestoreDoc, deleteDoc } from 'firebase/firestore';

// Helper to safely convert Firestore Timestamps or Dates to ISO strings
const convertToISOString = (dateField: any): string | undefined => {
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
  filePath?: string | null; // Path to uploaded file in Firebase Storage, can be null
  amountInEur?: number; // Calculated amount in EUR
  exchangeRateToEur?: number | null; // Rate used for conversion to EUR (1 original currency = X EUR)
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  turqualityApplicable?: boolean;
  turqualityTaskId?: string;
}

export interface InvoiceInputData {
  invoiceNumber: string;
  invoiceDate: Date; // Expect Date from form
  hotel: string;
  spendingCategoryName: string;
  companyName: string;
  originalAmount: number;
  originalCurrency: string;
  description?: string;
  file?: File | null; // For potential file upload
  amountInEur: number; // Calculated amount in EUR, must be provided
  exchangeRateToEur?: number | null;
}

const INVOICES_COLLECTION = 'invoices';

export async function addInvoice(invoiceData: InvoiceInputData): Promise<Invoice> {
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

    let filePathToSave: string | null = null;
    if (invoiceData.file && invoiceData.file.name) {
        filePathToSave = `simulated/path/to/${invoiceData.file.name}`;
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
      filePath: filePathToSave,
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
      filePath: filePathToSave,
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
        filePath: data.filePath,
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
  if (updates.filePath === undefined) {
    dataToUpdate.filePath = null;
  }
  if (updates.exchangeRateToEur === undefined) {
    dataToUpdate.exchangeRateToEur = null;
  }
  await updateDoc(invoiceDoc, dataToUpdate);
}

export async function deleteInvoice(id: string): Promise<void> {
  if (!id) {
    throw new Error("Fatura ID'si silme işlemi için zorunludur.");
  }
  try {
    const invoiceDoc = doc(db, INVOICES_COLLECTION, id);
    await deleteDoc(invoiceDoc);
    console.log(`Invoice with ID: ${id} successfully deleted from Firestore.`);
  } catch (error: any) {
    console.error(`Error deleting invoice with ID ${id} from Firestore: `, error);
    throw new Error(`Fatura (ID: ${id}) Firestore'dan silinirken bir hata oluştu: ${error.message || 'Bilinmeyen sunucu hatası'}`);
  }
}
