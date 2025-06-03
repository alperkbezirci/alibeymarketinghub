// src/app/(app)/budget/category/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {useParams, useRouter} from 'next/navigation';
import { useSpendingCategories, type SpendingCategory } from '@/contexts/spending-categories-context';
import { getAllInvoices, deleteInvoice, type Invoice } from '@/services/invoice-service';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, AlertTriangle, LineChart, ListFilter, Edit2, Trash2, Loader2, Download } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MonthlySpending {
  monthYear: string; // Format "YYYY-MM" for sorting
  displayMonth: string; // Format "Ay YYYY" for display
  totalSpent: number;
}

export default function SpendingCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = typeof params.id === 'string' ? params.id : undefined;
  const { toast } = useToast();
  const { isAdminOrMarketingManager } = useAuth();

  const { categories: allCategories, isLoading: isLoadingCategoriesContext, error: categoriesContextError } = useSpendingCategories();

  const [selectedCategory, setSelectedCategory] = useState<SpendingCategory | null>(null);
  const [invoicesForCategory, setInvoicesForCategory] = useState<Invoice[]>([]);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlySpending[]>([]);

  const [isLoadingCategoryDetails, setIsLoadingCategoryDetails] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);


  useEffect(() => {
    if (!categoryId) {
      setPageError("Kategori ID bulunamadı.");
      setIsLoadingCategoryDetails(false);
      return;
    }
    if (isLoadingCategoriesContext) {
      return;
    }
    if (categoriesContextError) {
        setPageError(`Kategoriler yüklenirken hata: ${categoriesContextError}`);
        setIsLoadingCategoryDetails(false);
        return;
    }

    const foundCategory = allCategories.find(cat => cat.id === categoryId);
    if (foundCategory) {
      setSelectedCategory(foundCategory);
    } else {
      setPageError("Belirtilen ID ile kategori bulunamadı.");
      toast({ title: "Hata", description: "Kategori bulunamadı.", variant: "destructive" });
    }
    setIsLoadingCategoryDetails(false);
  }, [categoryId, allCategories, isLoadingCategoriesContext, categoriesContextError, toast]);

  const fetchInvoicesForCategory = useCallback(async () => {
    if (!selectedCategory) return;

    setIsLoadingInvoices(true);
    setPageError(null);
    try {
      const allInvoicesData = await getAllInvoices();
      const filtered = allInvoicesData.filter(inv => inv.spendingCategoryName === selectedCategory.name);
      setInvoicesForCategory(filtered);
    } catch (err: any) {
      console.error("Error fetching invoices for category:", err);
      const errorMsg = err.message || "Bu kategoriye ait faturalar yüklenirken bir sorun oluştu.";
      setPageError(errorMsg);
      toast({ title: "Fatura Yükleme Hatası", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoadingInvoices(false);
    }
  }, [selectedCategory, toast]);

  useEffect(() => {
    if (selectedCategory) {
      fetchInvoicesForCategory();
    }
  }, [selectedCategory, fetchInvoicesForCategory]);

  useEffect(() => {
    if (invoicesForCategory.length > 0) {
      const spendingByMonth: Record<string, number> = {};
      invoicesForCategory.forEach(invoice => {
        if (invoice.invoiceDate && invoice.amountInEur) {
          try {
            const date = parseISO(invoice.invoiceDate);
            const monthYearKey = format(date, 'yyyy-MM');
            spendingByMonth[monthYearKey] = (spendingByMonth[monthYearKey] || 0) + invoice.amountInEur;
          } catch (_e: any) {
             console.warn(`Geçersiz fatura tarihi: ${invoice.invoiceDate} (ID: ${invoice.id})`);
          }
        }
      });

      const chartDataFormatted: MonthlySpending[] = Object.entries(spendingByMonth)
        .map(([monthYear, totalSpent]) => ({
          monthYear: monthYear,
          displayMonth: format(parseISO(`${monthYear}-01`), 'MMMM yyyy'),
          totalSpent: totalSpent,
        }))
        .sort((a, b) => a.monthYear.localeCompare(b.monthYear));

      setMonthlyChartData(chartDataFormatted);
    } else {
        setMonthlyChartData([]);
    }
  }, [invoicesForCategory]);

  const handleEditInvoice = (invoiceId: string) => {
    toast({ title: "Düzenle (Yapım Aşamasında)", description: `Fatura ID: ${invoiceId} için düzenleme formu açılacak.` });
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeletingInvoice(true);
    try {
      await deleteInvoice(invoiceToDelete.id);
      
      const updatedInvoices = invoicesForCategory.filter(inv => inv.id !== invoiceToDelete!.id);
      setInvoicesForCategory(updatedInvoices);
      
       if (updatedInvoices.length > 0) {
        const spendingByMonth: Record<string, number> = {};
        updatedInvoices.forEach(invoice => {
            if (invoice.invoiceDate && invoice.amountInEur) {
            try {
                const date = parseISO(invoice.invoiceDate);
                const monthYearKey = format(date, 'yyyy-MM');
                spendingByMonth[monthYearKey] = (spendingByMonth[monthYearKey] || 0) + invoice.amountInEur;
            } catch (_e: any) {
                console.warn(`Geçersiz fatura tarihi: ${invoice.invoiceDate} (ID: ${invoice.id})`);
            }
            }
        });
        const chartDataFormatted: MonthlySpending[] = Object.entries(spendingByMonth)
            .map(([monthYear, totalSpent]) => ({
            monthYear: monthYear,
            displayMonth: format(parseISO(`${monthYear}-01`), 'MMMM yyyy'),
            totalSpent: totalSpent,
            }))
            .sort((a, b) => a.monthYear.localeCompare(b.monthYear));
        setMonthlyChartData(chartDataFormatted);
        } else {
            setMonthlyChartData([]);
        }

      toast({ title: "Başarılı", description: `Fatura "${invoiceToDelete.invoiceNumber}" başarıyla silindi.` });
      setInvoiceToDelete(null);
    } catch (error: any) {
      toast({ title: "Silme Hatası", description: error.message || "Fatura silinirken bir hata oluştu.", variant: "destructive" });
      fetchInvoicesForCategory();
    } finally {
      setIsDeletingInvoice(false);
    }
  };


  const isLoading = isLoadingCategoryDetails || isLoadingInvoices;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 animate-pulse">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Hata</h2>
        <p className="text-muted-foreground mb-4">{pageError}</p>
        <Button onClick={() => router.push('/budget')}>Bütçe Sayfasına Dön</Button>
      </div>
    );
  }

  if (!selectedCategory) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertTriangle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Kategori Yükleniyor...</h2>
        <p className="text-muted-foreground mb-4">Kategori bilgileri yüklenemedi veya bulunamadı.</p>
        <Button onClick={() => router.push('/budget')}>Bütçe Sayfasına Dön</Button>
      </div>
    );
  }
  
  const getFileNameFromPath = (path?: string) => {
    if (!path) return "Dosyayı İndir";
    // UUID'yi ve başlangıçtaki olası 'invoices/' veya 'project-activities/' gibi klasör adlarını kaldır
    const nameWithoutPrefix = path.split('/').pop() || path;
    return nameWithoutPrefix.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '') || "Dosya";
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/budget')} className="mb-4 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" /> Bütçe Sayfasına Dön
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">{selectedCategory.name}</CardTitle>
          <CardDescription className="text-base">
            Limit: {selectedCategory.limit.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' })}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <LineChart className="mr-2 h-5 w-5 text-primary" /> Aylık Harcama Grafiği
          </CardTitle>
          <CardDescription>Bu kategori için yapılan aylık toplam harcamalar (EUR).</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={monthlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayMonth" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(value) => `${value.toLocaleString('tr-TR')} €`} />
                <Tooltip formatter={(value: number) => [value.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' }), "Harcama"]} />
                <Legend wrapperStyle={{fontSize: "12px"}} />
                <Bar dataKey="totalSpent" name="Aylık Harcama" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Bu kategori için gösterilecek aylık harcama verisi bulunmamaktadır.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <ListFilter className="mr-2 h-5 w-5 text-primary" /> Kategori Faturaları
          </CardTitle>
          <CardDescription>{selectedCategory.name} kategorisine ait faturalar.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesForCategory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura No</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Şirket</TableHead>
                  <TableHead className="text-right">Orj. Tutar</TableHead>
                  <TableHead className="text-right">EUR Karşılığı</TableHead>
                  <TableHead>Dosya</TableHead>
                  {isAdminOrMarketingManager && <TableHead className="text-right print:hidden">Eylemler</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesForCategory.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{format(parseISO(invoice.invoiceDate), 'dd.MM.yyyy')}</TableCell>
                    <TableCell>{invoice.companyName}</TableCell>
                    <TableCell className="text-right">
                      {invoice.originalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {invoice.originalCurrency}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.amountInEur?.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' }) ?? 'N/A'}
                    </TableCell>
                    <TableCell>
                      {invoice.fileURL ? (
                        <a href={invoice.fileURL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                          <Download className="mr-1 h-4 w-4" /> {getFileNameFromPath(invoice.storagePath)}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    {isAdminOrMarketingManager && (
                      <TableCell className="text-right space-x-1 print:hidden">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-500" onClick={() => handleEditInvoice(invoice.id)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => setInvoiceToDelete(invoice)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <p className="text-sm text-muted-foreground text-center py-8">Bu kategoriye ait fatura bulunmamaktadır.</p>
          )}
        </CardContent>
      </Card>

      {isAdminOrMarketingManager && invoiceToDelete && (
        <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => { if (!open) setInvoiceToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Faturayı Silmek Üzeresiniz</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{invoiceToDelete.invoiceNumber}&quot; numaralı, {invoiceToDelete.companyName} adına kesilmiş faturayı silmek istediğinizden emin misiniz?
                Bu işlem geri alınamaz. Varsa, ilişkili dosya da Storage'dan silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setInvoiceToDelete(null)} disabled={isDeletingInvoice}>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteInvoice}
                disabled={isDeletingInvoice}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingInvoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Evet, Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
