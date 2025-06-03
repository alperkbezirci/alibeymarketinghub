
// src/app/(app)/budget/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, TrendingUp, Layers, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/budget/invoice-form"; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HOTEL_NAMES } from "@/lib/constants";
import { useSpendingCategories, type SpendingCategory } from "@/contexts/spending-categories-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// TODO: Define proper types for BudgetSummaryItem
interface BudgetSummaryItem {
  name: string;
  totalBudget: number;
  spent: number;
  remaining: number;
}
// Data will be fetched/calculated from Firebase
const initialBudgetSummaryData: BudgetSummaryItem[] = [];

interface SpendingCategoryDisplayData extends SpendingCategory {
  spent: number;
}

export default function BudgetPage() {
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false); // Renamed for clarity
  const { toast } = useToast();
  const { categories: spendingCategoriesFromContext, isLoading: isLoadingCategories, error: categoriesError, refetchCategories } = useSpendingCategories();
  const [budgetSummaryData, setBudgetSummaryData] = useState<BudgetSummaryItem[]>(initialBudgetSummaryData);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // TODO: Fetch invoices/expenses from Firebase to calculate actual 'spent' amounts for categories and budget summary.
  // This useEffect is a placeholder for that logic.
  useEffect(() => {
    console.log("BudgetPage: useEffect - A_FETCH_INVOICES_AND_CALCULATE_BUDGETS from Firebase");
    // Example:
    // const calculateBudgets = async () => {
    //   // const invoices = await getInvoicesFromFirestore();
    //   // const calculatedSummary = calculateBudgetSummary(invoices, spendingCategoriesFromContext);
    //   // setBudgetSummaryData(calculatedSummary);
    //   // Update spendingCategoriesData with actual spent amounts as well
    // };
    // if (spendingCategoriesFromContext.length > 0) {
    //   calculateBudgets();
    // }
  }, [spendingCategoriesFromContext]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setIsInvoiceDialogOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname, setIsInvoiceDialogOpen]);

  const spendingCategoriesData = useMemo(() => {
    // TODO: Calculate real spent amounts based on invoices from Firebase.
    // For now, 'spent' is 0 until actual data is fetched and processed.
    return spendingCategoriesFromContext.map(category => ({
      ...category,
      spent: 0, 
    }));
  }, [spendingCategoriesFromContext]);


  const handleSaveInvoice = (formData: any) => {
    console.log("Yeni Fatura Kaydedildi (Firebase'e eklenecek):", formData);
    // TODO: Save formData to Firebase (e.g., an 'invoices' collection).
    // After saving, refetch/recalculate budget data.
    
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
    
    toast({ title: "Başarılı (Yerel)", description: `${description} Firebase'e kaydedilecek.` });
    setIsInvoiceDialogOpen(false);
    // After saving to Firebase, trigger a recalculation of budgetSummaryData and spendingCategoriesData's 'spent' amounts.
  };

  const totalBudget = budgetSummaryData.reduce((sum, item) => sum + item.totalBudget, 0);
  const totalSpent = budgetSummaryData.reduce((sum, item) => sum + item.spent, 0);
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

      {/* Main Budget Summary */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" /> Ana Bütçe Özeti
          </CardTitle>
          <CardDescription>Oteller bazında genel bütçe durumu (Firebase'den hesaplanacak).</CardDescription>
        </CardHeader>
        <CardContent>
          {budgetSummaryData.length > 0 ? (
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
            <p className="text-sm text-muted-foreground text-center py-8">Bütçe özeti verisi bulunmamaktadır. Veriler Firebase'den yüklenecek/hesaplanacaktır.</p>
          )}
        </CardContent>
      </Card>
      
      {/* Spending Categories */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <Layers className="mr-2 h-5 w-5 text-primary" /> Harcama Kategorileri
          </CardTitle>
          <CardDescription>Kategori bazında bütçe limitleri (Firestore'dan) ve harcamalar (Firebase'den hesaplanacak).</CardDescription>
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
                <Progress value={(category.spent / category.limit) * 100} className="h-2 mb-1" 
                  aria-label={`${category.name} bütçe kullanımı: ${(category.spent / category.limit) * 100}%`}
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
