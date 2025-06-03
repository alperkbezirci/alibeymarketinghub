
// src/app/(app)/budget/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link"; // Link import edildi
import { Button } from "@/components/ui/button";
import { PlusCircle, TrendingUp, Layers, Loader2, Users, CheckCircle, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { InvoiceForm } from "@/components/budget/invoice-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HOTEL_NAMES, MANAGED_BUDGET_HOTELS } from "@/lib/constants";
import { useSpendingCategories, type SpendingCategory } from "@/contexts/spending-categories-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getHotelBudgetLimits, type HotelBudgetLimits } from "@/services/budget-config-service";
import { addInvoice, getAllInvoices, type Invoice, type InvoiceInputData } from "@/services/invoice-service";
import { addTask, updateTaskAssignees, type TaskInputData } from "@/services/task-service";
import { getAllUsers, type User as AppUser } from "@/services/user-service";
import { format, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"; // cn import edildi

interface BudgetSummaryItem {
  name: string;
  totalBudget: number;
  spent: number;
  remaining: number;
}

const TURQUALITY_PROJECT_ID = "xDCcOOdDVUgSs1YUcLoU"; 

export default function BudgetPage() {
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const { toast } = useToast();
  const { categories: spendingCategoriesFromContext, isLoading: isLoadingSpendingCategories, error: categoriesError, refetchCategories } = useSpendingCategories();
  
  const [hotelBudgets, setHotelBudgets] = useState<HotelBudgetLimits>({});
  const [isLoadingBudgetConfig, setIsLoadingBudgetConfig] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [isTurqualityDialogOpen, setIsTurqualityDialogOpen] = useState(false);
  const [pendingInvoiceData, setPendingInvoiceData] = useState<InvoiceInputData | null>(null);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);
  const [newlyCreatedTurqualityTaskId, setNewlyCreatedTurqualityTaskId] = useState<string | null>(null);
  const [usersForAssignment, setUsersForAssignment] = useState<AppUser[]>([]);
  const [isLoadingUsersForAssignment, setIsLoadingUsersForAssignment] = useState(false);
  const [selectedTaskAssignees, setSelectedTaskAssignees] = useState<string[]>([]);
  const [isSubmittingTurquality, setIsSubmittingTurquality] = useState(false);

  const fetchBudgetData = useCallback(async () => {
    setIsLoadingBudgetConfig(true);
    setIsLoadingInvoices(true);
    try {
      const limitsPromise = getHotelBudgetLimits();
      const invoicesPromise = getAllInvoices();
      
      const [limits, fetchedInvoices] = await Promise.all([limitsPromise, invoicesPromise]);
      
      setHotelBudgets(limits);
      setInvoices(fetchedInvoices);
 
    } catch (error: any) {
      console.error("Error fetching budget data:", error);
      toast({ title: "Bütçe Yükleme Hatası", description: error.message || "Bütçe verileri yüklenirken bir sorun oluştu.", variant: "destructive"});
      setHotelBudgets(MANAGED_BUDGET_HOTELS.reduce((acc, name) => ({...acc, [name]: 0}), {}));
      setInvoices([]);
    } finally {
      setIsLoadingBudgetConfig(false);
      setIsLoadingInvoices(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' && !isInvoiceDialogOpen && !isTurqualityDialogOpen && !isAssignTaskDialogOpen) { 
      setIsInvoiceDialogOpen(true);
      router.replace(pathname, { scroll: false }); 
    }
  }, [searchParams, router, pathname, isInvoiceDialogOpen, isTurqualityDialogOpen, isAssignTaskDialogOpen]);


  const budgetSummaryData = useMemo(() => {
    return MANAGED_BUDGET_HOTELS.map(hotelName => {
      const totalBudget = hotelBudgets[hotelName] || 0;
      const spent = invoices
        .filter(inv => inv.hotel === hotelName && typeof inv.amountInEur === 'number')
        .reduce((sum, inv) => sum + inv.amountInEur!, 0);
      return {
        name: hotelName,
        totalBudget: totalBudget,
        spent: spent,
        remaining: totalBudget - spent,
      };
    });
  }, [hotelBudgets, invoices]);

  const spendingCategoriesData = useMemo(() => {
    if (isLoadingSpendingCategories) return [];
    return spendingCategoriesFromContext.map(category => {
      const categorySpent = invoices
        .filter(inv => inv.spendingCategoryName === category.name && typeof inv.amountInEur === 'number')
        .reduce((sum, inv) => sum + inv.amountInEur!, 0);
      return { ...category, spent: categorySpent };
    });
  }, [spendingCategoriesFromContext, invoices, isLoadingSpendingCategories]);


  const handleSaveInvoice = (formData: InvoiceInputData) => {
    setPendingInvoiceData(formData);
    setIsInvoiceDialogOpen(false); 
    setIsTurqualityDialogOpen(true); 
  };
  
  const handleTurqualityConfirmation = async (isTurqualityApplicable: boolean) => {
    if (!pendingInvoiceData) return;
    setIsSubmittingTurquality(true);

    const baseDescription = `Fatura No: ${pendingInvoiceData.invoiceNumber}, ${pendingInvoiceData.originalAmount.toLocaleString('tr-TR')} ${pendingInvoiceData.originalCurrency} tutarında eklendi.`;
    let fullDescription = baseDescription;
     if (pendingInvoiceData.originalCurrency !== 'EUR' && pendingInvoiceData.amountInEur) {
      fullDescription += ` (EUR karşılığı: ${pendingInvoiceData.amountInEur.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' })})`;
    }

    try {
      await addInvoice(pendingInvoiceData);

      if (isTurqualityApplicable && pendingInvoiceData.invoiceDate && pendingInvoiceData.companyName) {
        const taskDueDate = addDays(new Date(pendingInvoiceData.invoiceDate), 7);
        const taskData: TaskInputData = {
          taskName: `Turquality: ${format(new Date(pendingInvoiceData.invoiceDate), "dd.MM.yyyy")} - ${pendingInvoiceData.companyName}`,
          project: TURQUALITY_PROJECT_ID, 
          hotel: pendingInvoiceData.hotel,
          status: "Yapılacak",
          priority: "Yüksek",
          dueDate: taskDueDate,
          description: `Turquality destek programı kapsamındaki ${pendingInvoiceData.invoiceNumber} numaralı, ${pendingInvoiceData.companyName} adına kesilmiş faturanın takibi. Tutar: ${pendingInvoiceData.originalAmount} ${pendingInvoiceData.originalCurrency}.`,
          assignedTo: [], 
        };
        const newTask = await addTask(taskData);
        setNewlyCreatedTurqualityTaskId(newTask.id);
        
        setIsLoadingUsersForAssignment(true);
        try {
            const users = await getAllUsers();
            setUsersForAssignment(users.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
        } catch (userError) {
            console.error("Error fetching users for task assignment:", userError);
            toast({ title: "Kullanıcı Yükleme Hatası", description: "Görev ataması için kullanıcılar yüklenemedi.", variant: "destructive" });
        } finally {
            setIsLoadingUsersForAssignment(false);
        }
        
        setIsAssignTaskDialogOpen(true); 
        toast({ title: "Başarılı", description: `${fullDescription} Turquality görevi oluşturuldu. Bütçe özeti güncellendi.` });

      } else {
        toast({ title: "Başarılı", description: `${fullDescription} Bütçe özeti güncellendi.` });
      }
      
      fetchBudgetData(); 
    } catch (error: any) {
 toast({ title: "Fatura Kayıt Hatası", description: error.message || "Fatura kaydedilirken bir sorun oluştu.", variant: "destructive" });
    } finally {
      setIsTurqualityDialogOpen(false);
      setPendingInvoiceData(null);
      setIsSubmittingTurquality(false);
    }
  };

  const handleAssignTaskAndClose = async () => { // Fixed ESLint error: Missing return type on function.
    if (!newlyCreatedTurqualityTaskId || selectedTaskAssignees.length === 0) {
      toast({ title: "Atama Yapılmadı", description: "Lütfen en az bir sorumlu seçin veya bu adımı iptal edin.", variant: "destructive" });
      return; 
    }
    setIsSubmittingTurquality(true);
    try {
      await updateTaskAssignees(newlyCreatedTurqualityTaskId, selectedTaskAssignees);
      toast({ title: "Görev Atandı", description: "Turquality görevi seçilen kişilere atandı." });
    } catch (error: any) {
 toast({ title: "Görev Atama Hatası", description: error.message || "Görev atanırken bir sorun oluştu.", variant: "destructive" });
    } finally {
      setIsAssignTaskDialogOpen(false);
      setNewlyCreatedTurqualityTaskId(null);
      setSelectedTaskAssignees([]);
      setIsSubmittingTurquality(false);
    }
  };

  const handleTaskAssigneeChange = (userId: string, checked: boolean) => {
    setSelectedTaskAssignees(prev =>
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
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

      <AlertDialog open={isTurqualityDialogOpen} onOpenChange={(open) => {
          if (!open && !isAssignTaskDialogOpen) { 
            setIsTurqualityDialogOpen(false);
            setPendingInvoiceData(null); 
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turquality Uygunluğu</AlertDialogTitle>
            <AlertDialogDescription>
              Bu fatura Turquality Destek Programı kapsamında mıdır?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleTurqualityConfirmation(false)} disabled={isSubmittingTurquality}>Hayır</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleTurqualityConfirmation(true)} disabled={isSubmittingTurquality}>
              {isSubmittingTurquality && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Evet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAssignTaskDialogOpen} onOpenChange={(open) => {
          if(!open){ 
              setIsAssignTaskDialogOpen(false);
              setNewlyCreatedTurqualityTaskId(null);
              setSelectedTaskAssignees([]);
          }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Turquality Görevine Sorumlu Ata</DialogTitle>
            <DialogDescription>
              Oluşturulan Turquality görevi için sorumlu kişi/kişileri seçin.
            </DialogDescription>
          </DialogHeader>
          {isLoadingUsersForAssignment ? (
            <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Kullanıcılar yükleniyor...</div>
          ) : usersForAssignment.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Atanacak kullanıcı bulunamadı.</p>
          ) : (
            <ScrollArea className="h-60 my-4 pr-3">
              <div className="space-y-2">
                {usersForAssignment.map(user => (
                  <div key={user.uid} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                    <Checkbox
                      id={`assignee-${user.uid}`}
                      checked={selectedTaskAssignees.includes(user.uid)}
                      onCheckedChange={(checked) => handleTaskAssigneeChange(user.uid, Boolean(checked))}
                    />
                    <Label htmlFor={`assignee-${user.uid}`} className="font-normal text-sm flex-grow cursor-pointer">
                      {`${user.firstName} ${user.lastName}`}
                      <span className="text-xs text-muted-foreground ml-1">({user.email})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
                setIsAssignTaskDialogOpen(false); 
                setNewlyCreatedTurqualityTaskId(null); 
                setSelectedTaskAssignees([]);
            }} disabled={isSubmittingTurquality}>
                İptal / Daha Sonra Ata
            </Button>
            <Button onClick={handleAssignTaskAndClose} disabled={isSubmittingTurquality || isLoadingUsersForAssignment || selectedTaskAssignees.length === 0}>
              {isSubmittingTurquality && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ata ve Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" /> Ana Bütçe Özeti
          </CardTitle>
          <CardDescription>Oteller bazında genel bütçe durumu. Limitler CMS'den, harcamalar faturalardan hesaplanmaktadır.</CardDescription>
        </CardHeader>
        <CardContent>
          {(isLoadingBudgetConfig || isLoadingInvoices) ? (
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
          <CardDescription>Kategori bazında bütçe limitleri (CMS'den) ve harcamalar (faturalardan hesaplanmaktadır). Detayları görmek için bir kategoriye tıklayın.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isLoadingSpendingCategories || isLoadingInvoices) ? (
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
            <Link key={category.id} href={`/budget/category/${category.id}`} passHref>
              <Card className={cn("bg-card/50 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col")}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">{category.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <Progress value={(category.limit > 0 ? (category.spent / category.limit) * 100 : 0)} className="h-2 mb-1" 
                    aria-label={`${category.name} bütçe kullanımı: ${(category.limit > 0 ? (category.spent / category.limit) * 100 : 0).toFixed(1)}%`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {category.spent.toLocaleString('tr-TR', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0})} / {category.limit.toLocaleString('tr-TR', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )) : (
            <p className="text-sm text-muted-foreground col-span-full text-center">Yönetilecek harcama kategorisi bulunmuyor. CMS sayfasından ekleyebilirsiniz.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
      

    

