
// src/app/(app)/budget/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, TrendingUp, Layers, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/budget/invoice-form"; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HOTEL_NAMES } from "@/lib/constants"; // Will be filtered by MANAGED_BUDGET_HOTELS
import { useSpendingCategories, type SpendingCategory } from "@/contexts/spending-categories-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getHotelBudgetLimits, type HotelBudgetLimits, MANAGED_BUDGET_HOTELS } from "@/services/budget-config-service";
// TODO: Import getInvoices and Invoice type from a new invoice-service.ts
// For now, we'll mock invoice data handling.

interface BudgetSummaryItem {
  name: string;
  totalBudget: number;
  spent: number;
  remaining: number;
}

interface SpendingCategoryDisplayData extends SpendingCategory {
  spent: number;
}

export default function BudgetPage() {
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const { toast } = useToast();
  const { categories: spendingCategoriesFromContext, isLoading: isLoadingCategories, error: categoriesError, refetchCategories } = useSpendingCategories();
  
  const [budgetSummaryData, setBudgetSummaryData] = useState<BudgetSummaryItem[]>([]);
  const [isLoadingBudgetConfig, setIsLoadingBudgetConfig] = useState(true);
  // const [invoices, setInvoices] = useState<Invoice[]>([]); // Placeholder for invoices
  // const [isLoadingInvoices, setIsLoadingInvoices] = useState(true); // Placeholder

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const fetchBudgetData = useCallback(async () => {
    setIsLoadingBudgetConfig(true);
    // setIsLoadingInvoices(true); 
    try {
      const limits = await getHotelBudgetLimits();
      // const fetchedInvoices = await getInvoices(); // TODO: Implement getInvoices
      // setInvoices(fetchedInvoices);

      const summaryItems: BudgetSummaryItem[] = MANAGED_BUDGET_HOTELS.map(hotelName => {
        const totalBudget = limits[hotelName] || 0;
        // TODO: Calculate spent amount from fetchedInvoices for this hotelName
        const spent = 0; // Placeholder until invoice service is integrated
        // const spent = fetchedInvoices.filter(inv => inv.hotel === hotelName).reduce((sum, inv) => sum + (inv.amountInEur || 0), 0);
        return {
          name: hotelName,
          totalBudget: totalBudget,
          spent: spent,
          remaining: totalBudget - spent,
        };
      });
      setBudgetSummaryData(summaryItems);

    } catch (error: any) {
      console.error("Error fetching budget data:", error);
      toast({ title: "Bütçe Yükleme Hatası", description: error.message || "Bütçe verileri yüklenirken bir sorun oluştu.", variant: "destructive"});
      // Fallback: Populate with hotel names and zero budgets if fetching fails
      setBudgetSummaryData(MANAGED_BUDGET_HOTELS.map(name => ({ name, totalBudget: 0, spent: 0, remaining: 0 })));
    } finally {
      setIsLoadingBudgetConfig(false);
      // setIsLoadingInvoices(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setIsInvoiceDialogOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname, setIsInvoiceDialogOpen]);

  const spendingCategoriesData = useMemo(() => {
    return spendingCategoriesFromContext.map(category => ({
      ...category,
      spent: 0, // Placeholder: Calculate from invoices later
      // const categorySpent = invoices.filter(inv => inv.spendingCategory === category.id) // Or category.name
      //                             .reduce((sum, inv) => sum + (inv.amountInEur || 0), 0);
      // return { ...category, spent: categorySpent };
    }));
  }, [spendingCategoriesFromContext /*, invoices */]);


  const handleSaveInvoice = (formData: any) => {
    console.log("Yeni Fatura Kaydedildi (Firebase'e eklenecek):", formData);
    // TODO: Save formData to Firebase using an 'invoice-service'.
    // After saving, call fetchBudgetData() to refetch/recalculate budget data including spent amounts.
    
    let description = `Fatura No: ${formData.invoiceNumber}, ${formData.originalAmount.toLocaleString('tr-TR')} ${formData.originalCurrency} tutarında eklendi.`;
    const amountForBudget = formData.amountInEur; 

    if (formData.originalCurrency !== 'EUR' && formData.amountInEur) {
      description += ` (Bütçeye yansıyacak EUR karşılığı: ${amountForBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' })}, Kur: 1 ${formData.originalCurrency} = ${(1 / formData.exchangeRateToEur).toFixed(4)} EUR)`;
    } else if (formData.originalCurrency === 'EUR') {
      description = `Fatura No: ${formData.invoiceNumber}, ${amountForBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' })} tutarında eklendi.`;
    }

    if (formData.file) {
      description += ` Dosya: ${formData.file.name}`;
    }
    
    toast({ title: "Başarılı (Simülasyon)", description: `${description} Gerçek kaydetme ve bütçe güncelleme eklenecek.` });
    setIsInvoiceDialogOpen(false);
    // fetchBudgetData(); // Call after successful save to Firebase
  };

  const totalBudget = useMemo(() => budgetSummaryData.reduce((sum, item) => sum + item.totalBudget, 0), [budgetSummaryData]);
  const totalSpent = useMemo(() => budgetSummaryData.reduce((sum, item) => sum + item.spent, 0), [budgetSummaryData]);
  const overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-headline font-bold">Bütçe Yönetimi</h1>
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Fatura Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Yeni Fatura</DialogTitle>
              <DialogDescription>
                Yeni bir fatura kaydı oluşturmak için lütfen fatura detaylarını girin.
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm onSave={handleSaveInvoice} onClose={() => setIsInvoiceDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" /> Ana Bütçe Özeti
          </CardTitle>
          <CardDescription>Oteller bazında genel bütçe durumu. Limitler CMS'den, harcamalar faturalardan hesaplanacaktır.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBudgetConfig ? (
            <div className="space-y-4 py-8">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-1/3" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : budgetSummaryData.length > 0 ? (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Genel Toplam Harcama: {totalSpent.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' })}</span>
                  <span>Genel Toplam Bütçe: {totalBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <Progress value={overallProgress} className="w-full h-3" />
                <p className="text-xs text-muted-foreground text-right mt-1">{overallProgress.toFixed(1)}% kullanıldı</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={budgetSummaryData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} angle={-15} textAnchor="end" height={50} />
                  <YAxis fontSize={12} tickFormatter={(value) => `${(value / 1000)}k €`} />
                  <Tooltip formatter={(value: number) => [value.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' }), "Miktar"]} />
                  <Legend wrapperStyle={{fontSize: "12px"}}/>
                  <Bar dataKey="spent" name="Harcanan" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="remaining" name="Kalan" stackId="a" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Ana bütçe limitleri CMS üzerinden ayarlanmamış veya yüklenirken bir sorun oluştu.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <Layers className="mr-2 h-5 w-5 text-primary" /> Harcama Kategorileri
          </CardTitle>
          <CardDescription>Kategori bazında bütçe limitleri (CMS'den) ve harcamalar (faturalardan hesaplanacak).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoadingCategories ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="bg-card/50">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-2 w-full mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : categoriesError ? (
             <p className="text-sm text-destructive col-span-full text-center">{categoriesError} <Button variant="link" size="sm" onClick={refetchCategories}>Tekrar Dene</Button></p>
          ) : spendingCategoriesData.length > 0 ? spendingCategoriesData.map(category => (
            <Card key={category.id} className="bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={(category.limit > 0 ? (category.spent / category.limit) * 100 : 0)} className="h-2 mb-1" 
                  aria-label={`${category.name} bütçe kullanımı: ${(category.limit > 0 ? (category.spent / category.limit) * 100 : 0)}%`}
                />
                <p className="text-xs text-muted-foreground">
                  {category.spent.toLocaleString('tr-TR')}€ / {category.limit.toLocaleString('tr-TR')}€
                </p>
              </CardContent>
            </Card>
          )) : (
            <p className="text-sm text-muted-foreground col-span-full text-center">Yönetilecek harcama kategorisi bulunmuyor. CMS sayfasından ekleyebilirsiniz.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
