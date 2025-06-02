
// src/components/budget/invoice-form.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOTEL_NAMES, CURRENCIES } from "@/lib/constants";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useSpendingCategories } from '@/contexts/spending-categories-context';

interface InvoiceFormProps {
  onSave: (formData: any) => void;
  onClose: () => void;
  initialData?: any; 
}

export function InvoiceForm({ onSave, onClose, initialData }: InvoiceFormProps) {
  const { categories: spendingCategoriesFromContext, isLoading: isLoadingCategories } = useSpendingCategories();
  
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || "");
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(initialData?.invoiceDate ? new Date(initialData.invoiceDate) : new Date());
  const [hotel, setHotel] = useState(initialData?.hotel || (HOTEL_NAMES.length > 0 ? HOTEL_NAMES[0] : ""));
  const [category, setCategory] = useState(initialData?.category || ""); // Initialize to "" to show placeholder if no initial/default
  const [amount, setAmount] = useState<number | string>(initialData?.amount || "");
  const [currency, setCurrency] = useState(initialData?.currency || (CURRENCIES.length > 0 ? CURRENCIES[0] : ""));
  const [description, setDescription] = useState(initialData?.description || "");
  const [file, setFile] = useState<File | null>(null);
  const [rateEurToCurrency, setRateEurToCurrency] = useState<number | string>(""); 
  const [calculatedEurAmount, setCalculatedEurAmount] = useState<number | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Set initial category if not set and categories are loaded
    if (!initialData?.category && !category && spendingCategoriesFromContext.length > 0 && !isLoadingCategories) {
      setCategory(spendingCategoriesFromContext[0].name);
    }
  }, [initialData, category, spendingCategoriesFromContext, isLoadingCategories]);

  useEffect(() => {
    if (currency === 'EUR') {
      setRateEurToCurrency("");
    }
  }, [currency]);

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
  }, [amount, currency, rateEurToCurrency]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !invoiceDate || !amount) {
      toast({ title: "Eksik Bilgi", description: "Lütfen fatura numarası, tarih ve tutar alanlarını doldurun.", variant: "destructive" });
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

    let finalAmountInEur = numericAmount;
    let finalExchangeRateForToast: number | null = null; 

    if (currency !== 'EUR') {
      const numericRateEurToCurrency = parseFloat(String(rateEurToCurrency));
      if (!rateEurToCurrency || isNaN(numericRateEurToCurrency) || numericRateEurToCurrency <= 0) {
        toast({ title: "Eksik Bilgi", description: "Lütfen geçerli bir döviz kuru girin (1 EUR = X " + currency +").", variant: "destructive" });
        return;
      }
      finalAmountInEur = numericAmount / numericRateEurToCurrency;
      finalExchangeRateForToast = 1 / numericRateEurToCurrency; 
    }

    onSave({
      invoiceNumber,
      invoiceDate,
      hotel,
      category, // Pass category name
      originalAmount: numericAmount,
      originalCurrency: currency,
      description,
      file,
      amountInEur: finalAmountInEur,
      exchangeRateToEur: finalExchangeRateForToast, 
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="invoiceNumber">Fatura Numarası *</Label>
        <Input id="invoiceNumber" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
      </div>

      <div>
        <Label htmlFor="invoiceDate">Fatura Tarihi *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
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
          <Select value={hotel} onValueChange={setHotel}>
            <SelectTrigger id="hotel"><SelectValue placeholder="Otel seçin" /></SelectTrigger>
            <SelectContent>
              {HOTEL_NAMES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="category">Kategori *</Label>
          <Select value={category} onValueChange={setCategory} required disabled={isLoadingCategories}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Tutar *</Label>
          <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required step="0.01" />
        </div>
        <div>
          <Label htmlFor="currency">Para Birimi</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency"><SelectValue placeholder="Para birimi seçin" /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {currency !== 'EUR' && (
        <div>
          <Label htmlFor="rateEurToCurrency">Döviz Kuru (1 EUR = X {currency}) *</Label>
          <Input
            id="rateEurToCurrency"
            type="number"
            value={rateEurToCurrency}
            onChange={(e) => setRateEurToCurrency(e.target.value)}
            placeholder={`Örn: ${currency === 'TRY' ? '35.5' : currency === 'USD' ? '1.08' : 'Kur girin'}`}
            required
            step="0.000001"
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
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div>
        <Label htmlFor="fileUpload">Dosya Yükle (Opsiyonel)</Label>
        <Input id="fileUpload" type="file" onChange={handleFileChange} />
        <p className="text-xs text-muted-foreground mt-1">Fatura görseli veya ilgili belgeyi yükleyebilirsiniz.</p>
        {file && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Seçilen dosya: {file.name}</p>}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
        <Button type="submit">Kaydet</Button>
      </div>
    </form>
  );
}

