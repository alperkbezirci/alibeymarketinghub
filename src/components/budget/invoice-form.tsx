
// src/components/budget/invoice-form.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES, CURRENCIES } from "@/lib/constants";
import { CalendarIcon, UploadCloud, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useSpendingCategories } from '@/contexts/spending-categories-context';
import { cn } from "@/lib/utils";

// This interface defines the shape of data the form itself manages and passes to its onSave callback
export interface InvoiceFormData {
  invoiceNumber: string;
  invoiceDate: Date;
  hotel: string;
  spendingCategoryName: string;
  companyName: string;
  originalAmount: number;
  originalCurrency: string;
  description?: string;
  file?: File | null; // File object for upload
  amountInEur: number;
  exchangeRateToEur?: number | null;
}

interface InvoiceFormProps {
  onSave: (formData: InvoiceFormData) => void; // Callback now expects InvoiceFormData
  onClose: () => void;
  initialData?: Partial<InvoiceFormData>; // Allow partial initial data matching the form's structure
  isSaving?: boolean; // For the main save button in the dialog
}

export function InvoiceForm({ onSave, onClose, initialData, isSaving }: InvoiceFormProps) {
  const { categories: spendingCategoriesFromContext, isLoading: isLoadingCategories } = useSpendingCategories();

  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || "");
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(initialData?.invoiceDate ? new Date(initialData.invoiceDate) : new Date());
  const [hotel, setHotel] = useState(initialData?.hotel || (HOTEL_NAMES.length > 0 ? HOTEL_NAMES[0] : ""));
  const [category, setCategory] = useState(initialData?.spendingCategoryName || "");
  const [companyName, setCompanyName] = useState(initialData?.companyName || "");
  const [amount, setAmount] = useState<number | string>(initialData?.originalAmount || "");
  const [currency, setCurrency] = useState(initialData?.originalCurrency || (CURRENCIES.length > 0 ? CURRENCIES[0] : ""));
  const [description, setDescription] = useState(initialData?.description || "");
  const [file, setFile] = useState<File | null>(initialData?.file || null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(initialData?.file?.name || null);
  const [rateEurToCurrency, setRateEurToCurrency] = useState<number | string>(initialData?.exchangeRateToEur ? (1 / initialData.exchangeRateToEur) : "");
  const [calculatedEurAmount, setCalculatedEurAmount] = useState<number | null>(initialData?.amountInEur || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!initialData?.spendingCategoryName && !category && spendingCategoriesFromContext.length > 0 && !isLoadingCategories) {
      setCategory(spendingCategoriesFromContext[0].name);
    }
  }, [initialData, category, spendingCategoriesFromContext, isLoadingCategories, setCategory]);

  useEffect(() => {
    if (currency === 'EUR') {
      setRateEurToCurrency(""); // Clear rate if currency is EUR
    }
  }, [currency, setRateEurToCurrency]);

  useEffect(() => {
    const localAmount = parseFloat(String(amount));
    const localRate = parseFloat(String(rateEurToCurrency));

    if (currency === 'EUR') {
      if (!isNaN(localAmount) && localAmount > 0) {
        setCalculatedEurAmount(localAmount);
      } else {
        setCalculatedEurAmount(null);
      }
    } else {
      if (!isNaN(localAmount) && localAmount > 0 && !isNaN(localRate) && localRate > 0) {
        setCalculatedEurAmount(localAmount / localRate);
      } else {
        setCalculatedEurAmount(null);
      }
    }
  }, [amount, currency, rateEurToCurrency, setCalculatedEurAmount]);

  const handleSubmit = (e: React.FormEvent) => {
 if (!invoiceNumber || !invoiceDate || !companyName || !amount) {
      toast({ title: "Eksik Bilgi", description: "Lütfen fatura numarası, tarih, şirket adı ve tutar alanlarını doldurun.", variant: "destructive" });
      return;
    }
    const numericAmount = parseFloat(String(amount));
    if (isNaN(numericAmount) || numericAmount <= 0) {
        toast({ title: "Geçersiz Tutar", description: "Lütfen geçerli bir tutar girin.", variant: "destructive" });
        return;
    }
    if (!category) {
      toast({ title: "Eksik Bilgi", description: "Lütfen bir harcama kategorisi seçin.", variant: "destructive" });
      return;
    }

    let finalExchangeRateForToast: number | null = null;

    if (currency !== 'EUR') {
      const numericRateEurToCurrency = parseFloat(String(rateEurToCurrency));
      if (!rateEurToCurrency || isNaN(numericRateEurToCurrency) || numericRateEurToCurrency <= 0) {
        toast({ title: "Eksik Bilgi", description: "Lütfen geçerli bir döviz kuru girin (1 EUR = X " + currency +").", variant: "destructive" });
        return;
      }
      finalExchangeRateForToast = 1 / numericRateEurToCurrency; // Store rate as 1 Original = X EUR
    } else {
    }

    if (calculatedEurAmount === null || isNaN(calculatedEurAmount)) {
        toast({ title: "Hesaplama Hatası", description: "EUR karşılığı hesaplanamadı. Lütfen tutar ve kuru kontrol edin.", variant: "destructive" });
        return;
    }


    onSave({
      invoiceNumber,
      invoiceDate, // Already a Date object
      hotel,
      spendingCategoryName: category,
      companyName,
      originalAmount: numericAmount,
      originalCurrency: currency,
      description,
      file, // Pass the File object
      amountInEur: calculatedEurAmount, // Use the state-calculated EUR amount
      exchangeRateToEur: currency === 'EUR' ? null : finalExchangeRateForToast,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSelectedFileName(e.target.files[0].name);
    } else {
      setFile(null);
      setSelectedFileName(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="invoiceNumber">Fatura Numarası <span className="text-destructive">*</span></Label>
        <Input id="invoiceNumber" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required disabled={isSaving} />
      </div>

      <div>
        <Label htmlFor="invoiceDate">Fatura Tarihi <span className="text-destructive">*</span></Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className="w-full justify-start text-left font-normal" disabled={isSaving}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {invoiceDate ? format(invoiceDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={invoiceDate} onSelect={setInvoiceDate} initialFocus locale={tr} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hotel">Otel</Label>
          <Select value={hotel} onValueChange={setHotel} disabled={isSaving}>
            <SelectTrigger id="hotel"><SelectValue placeholder="Otel seçin" /></SelectTrigger>
            <SelectContent>
              {HOTEL_NAMES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="category">Kategori <span className="text-destructive">*</span></Label>
          <Select value={category} onValueChange={setCategory} required disabled={isLoadingCategories || isSaving}>
            <SelectTrigger id="category"><SelectValue placeholder={isLoadingCategories? "Kategoriler yükleniyor..." : "Kategori seçin"} /></SelectTrigger>
            <SelectContent>
              {isLoadingCategories && <SelectItem value="loading_placeholder" disabled>Yükleniyor...</SelectItem>}
              {!isLoadingCategories && spendingCategoriesFromContext.length > 0 ? (
                spendingCategoriesFromContext.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
              ) : !isLoadingCategories ? (
                <SelectItem value="no_categories_placeholder" disabled>Kategori bulunamadı</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="companyName">Şirket Adı <span className="text-destructive">*</span></Label>
        <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required disabled={isSaving} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Tutar <span className="text-destructive">*</span></Label>
          <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required step="0.01" disabled={isSaving} />
        </div>
        <div>
          <Label htmlFor="currency">Para Birimi</Label>
          <Select value={currency} onValueChange={setCurrency} disabled={isSaving}>
            <SelectTrigger id="currency"><SelectValue placeholder="Para birimi seçin" /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {currency !== 'EUR' && (
        <div>
          <Label htmlFor="rateEurToCurrency">Döviz Kuru (1 EUR = X {currency}) <span className="text-destructive">*</span></Label>
          <Input
            id="rateEurToCurrency"
            type="number"
            value={rateEurToCurrency}
            onChange={(e) => setRateEurToCurrency(e.target.value)}
            placeholder={`Örn: ${currency === 'TRY' ? '35.5' : currency === 'USD' ? '1.08' : 'Kur girin'}`}
            required
            step="0.000001"
            disabled={isSaving}
          />
           <p className="text-xs text-muted-foreground mt-1">
 1 EUR'nun kaç {currency} yaptığını giriniz.
          </p>
        </div>
      )}

      {calculatedEurAmount !== null && (
        <div className="my-3 rounded-md border bg-muted/20 p-3 shadow-sm">
          <Label className="text-sm font-normal text-muted-foreground">
            {currency === 'EUR' ? 'Fatura Tutarı (EUR)' : 'Faturanın EUR Karşılığı'}
          </Label>
          <p className="text-xl font-semibold text-primary mt-1">
            {calculatedEurAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="description">Açıklama</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={isSaving} />
      </div>

      <div>
        <Label htmlFor="fileUpload">Dosya Yükle (Opsiyonel)</Label>
        <div className="flex flex-col gap-2 mt-1">
            <Input 
                id="fileUpload" 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange} 
                className="hidden"
                disabled={isSaving}
            />
            <Label
                htmlFor="fileUpload"
                className={cn(
                    buttonVariants({ variant: "outline" }),
                    "cursor-pointer w-full sm:w-auto justify-center flex items-center",
                    isSaving && "opacity-50 cursor-not-allowed"
                )}
                onClick={(e) => { if (isSaving) e.preventDefault(); }}
            >
                <UploadCloud className="mr-2 h-4 w-4" />
                Dosya Seç
            </Label>
            {selectedFileName ? (
                <p className="text-sm text-muted-foreground">Seçilen dosya: {selectedFileName}</p>
            ) : (
                <p className="text-sm text-muted-foreground">Dosya seçilmedi.</p>
            )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Fatura görseli veya ilgili belgeyi yükleyebilirsiniz.</p>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>İptal</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Kaydet
        </Button>
      </div>
    </form>
  );
}

