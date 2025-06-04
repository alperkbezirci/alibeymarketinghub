// src/app/(app)/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { QuickActions } from "@/components/dashboard/quick-actions";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { WeatherWidget } from "@/components/dashboard/weather-widget"; // WeatherWidget import edildi
import { useAuth } from "@/contexts/auth-context";
import { ClipboardList, ListTodo, CheckSquare, Loader2, AlertTriangle, PlusCircle } from "lucide-react";
import { getActiveTasks, getOverdueTasks, addTask, updateTaskAssignees, type Task, type TaskInputData } from '@/services/task-service';
import { getPendingApprovalActivities, type ProjectActivity } from '@/services/project-activity-service';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { InvoiceForm } from "@/components/budget/invoice-form"; // InvoiceFormData düzeltildi, type InvoiceInputDataForService olmalıydı. Bu form kendi state'i için InvoiceFormData kullanıyor, servise gönderirken dönüşüm yapılıyor.
import { addInvoice, type InvoiceInputDataForService, linkTaskToInvoice } from '@/services/invoice-service'; // Service için doğru tip
import { getAllUsers, type User as AppUser } from "@/services/user-service";
import { format, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const TURQUALITY_PROJECT_ID = "xDCcOOdDVUgSs1YUcLoU";

// Helper functions moved outside the component
const mapTaskToOverviewItem = (task: Task) => ({
  id: task.id,
  name: task.taskName || 'İsimsiz Görev',
  detail: `Bitiş Tarihi: ${task.dueDate ? format(new Date(task.dueDate), 'dd MMM yyyy', {locale: tr}) : 'N/A'} | Öncelik: ${task.priority || 'Normal'}`,
  projectId: task.project,
});

const mapActivityToOverviewItem = (activity: ProjectActivity) => ({
  id: activity.id,
  name: `Proje ID: ${activity.projectId.substring(0,10)}... | Kullanıcı: ${activity.userName}`,
  detail: `Tip: ${activity.type === 'comment' ? 'Yorum' : activity.type === 'file_upload' ? 'Dosya' : 'Durum'} | İçerik: ${(activity.content || activity.fileName || 'Detay Yok').substring(0, 30)}...`,
  projectId: activity.projectId,
});

export default function DashboardPage() {
  const { user, isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();

  const [activeTasksData, setActiveTasksData] = useState<Task[]>([]);
  const [isLoadingActiveTasks, setIsLoadingActiveTasks] = useState(true);

  const [overdueTasksData, setOverdueTasksData] = useState<Task[]>([]);
  const [isLoadingOverdueTasks, setIsLoadingOverdueTasks] = useState(true);

  const [pendingApprovalsData, setPendingApprovalsData] = useState<ProjectActivity[]>([]);
  const [isLoadingPendingApprovals, setIsLoadingPendingApprovals] = useState(true);

  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isTurqualityDialogOpen, setIsTurqualityDialogOpen] = useState(false);
  const [pendingInvoiceData, setPendingInvoiceData] = useState<InvoiceInputDataForService | null>(null); // Form datası service için hazırlanacak
  const [lastAddedInvoiceId, setLastAddedInvoiceId] = useState<string | null>(null);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);
  const [newlyCreatedTurqualityTaskId, setNewlyCreatedTurqualityTaskId] = useState<string | null>(null);
  const [usersForAssignment, setUsersForAssignment] = useState<AppUser[]>([]);
  const [isLoadingUsersForAssignment, setIsLoadingUsersForAssignment] = useState(false);
  const [selectedTaskAssignees, setSelectedTaskAssignees] = useState<string[]>([]);
  const [isSubmittingProcess, setIsSubmittingProcess] = useState(false); // Changed from isSubmittingInvoice for general purpose


  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setIsLoadingActiveTasks(true);
    setIsLoadingOverdueTasks(true);
    if (isAdminOrMarketingManager) setIsLoadingPendingApprovals(true);

    try {
      const activeTasksPromise = getActiveTasks(5);
      const overdueTasksPromise = getOverdueTasks(5);

      const [fetchedActiveTasks, fetchedOverdueTasks] = await Promise.all([activeTasksPromise, overdueTasksPromise]);
      setActiveTasksData(fetchedActiveTasks);
      setOverdueTasksData(fetchedOverdueTasks);

      if (isAdminOrMarketingManager) {
        const approvals = await getPendingApprovalActivities(5);
        setPendingApprovalsData(approvals);
      }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({ title: "Kontrol Paneli Hatası", description: "Veriler yüklenirken bir sorun oluştu.", variant: "destructive" });
    } finally {
      setIsLoadingActiveTasks(false);
      setIsLoadingOverdueTasks(false);
      if (isAdminOrMarketingManager) setIsLoadingPendingApprovals(false);
    }
  }, [user, isAdminOrMarketingManager, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSaveInvoiceForDashboard = async (formDataFromComponent: import('@/components/budget/invoice-form').InvoiceFormData) => {
    setIsSubmittingProcess(true); // Start general submission process
    setIsInvoiceDialogOpen(false);
    
    const invoiceDataForService: InvoiceInputDataForService = {
      invoiceNumber: formDataFromComponent.invoiceNumber,
      invoiceDate: formDataFromComponent.invoiceDate, // Already Date object from form
      hotel: formDataFromComponent.hotel,
      spendingCategoryName: formDataFromComponent.spendingCategoryName,
      companyName: formDataFromComponent.companyName,
      originalAmount: formDataFromComponent.originalAmount,
      originalCurrency: formDataFromComponent.originalCurrency,
      description: formDataFromComponent.description,
      amountInEur: formDataFromComponent.amountInEur,
      exchangeRateToEur: formDataFromComponent.exchangeRateToEur,
      // fileURL and storagePath will be handled if files are part of this quick action in future
    };

    setPendingInvoiceData(invoiceDataForService);

    try {
      const newInvoice = await addInvoice(invoiceDataForService);
      setLastAddedInvoiceId(newInvoice.id);
      setIsTurqualityDialogOpen(true);
    } catch (error: any) {
      toast({ title: "Fatura Kayıt Hatası", description: error.message || "Fatura kaydedilirken bir sorun oluştu.", variant: "destructive" });
      setPendingInvoiceData(null);
      setIsSubmittingProcess(false);
    }
  };

  const handleTurqualityConfirmationForDashboard = async (isTurqualityApplicable: boolean) => {
    if (!pendingInvoiceData || !lastAddedInvoiceId) {
        setIsSubmittingProcess(false); 
        return;
    }

    let mainToastDescription = `Fatura No: ${pendingInvoiceData.invoiceNumber} eklendi.`;
    if (pendingInvoiceData.originalCurrency !== 'EUR' && pendingInvoiceData.amountInEur) {
      mainToastDescription += ` (EUR karşılığı: ${pendingInvoiceData.amountInEur.toLocaleString('tr-TR', { style: 'currency', currency: 'EUR' })})`;
    }

    try {
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

        try {
            await linkTaskToInvoice(lastAddedInvoiceId, newTask.id);
            mainToastDescription += ` Turquality görevi oluşturuldu ve faturaya başarıyla bağlandı.`;
        } catch (linkError: any) {
            mainToastDescription += ` Turquality görevi oluşturuldu ancak faturaya bağlanırken bir hata oluştu: ${linkError.message}`;
            toast({ title: "Bağlantı Hatası", description: `Görev faturaya bağlanamadı: ${linkError.message}`, variant: "warning" });
        }
        
        setIsLoadingUsersForAssignment(true);
        try {
            const users = await getAllUsers();
            setUsersForAssignment(users.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
        } catch (userError) {
            console.error("Error fetching users for task assignment:", userError);
            mainToastDescription += " Atama için kullanıcılar yüklenemedi.";
            toast({ title: "Kullanıcı Yükleme Hatası", description: "Görev ataması için kullanıcılar yüklenemedi.", variant: "destructive" });
        } finally {
            setIsLoadingUsersForAssignment(false);
        }
        
        setIsAssignTaskDialogOpen(true);
        toast({ title: "Başarılı", description: mainToastDescription });
      } else {
        toast({ title: "Başarılı", description: `${mainToastDescription} Bütçe detayları için Bütçe sayfasını kontrol edin.` });
      }
      fetchDashboardData(); 
    } catch (error: any) {
      toast({ title: "Turquality İşlem Hatası", description: error.message || "Turquality işlemi sırasında bir sorun oluştu.", variant: "destructive" });
    } finally {
      setIsTurqualityDialogOpen(false);
      setPendingInvoiceData(null);
      // lastAddedInvoiceId should be cleared after assign task dialog, not here
      if (!isAssignTaskDialogOpen) { // Only reset if not opening assign task dialog
        setIsSubmittingProcess(false);
        setLastAddedInvoiceId(null);
      }
    }
  };

  const handleAssignTaskAndCloseForDashboard = async () => {
    if (!newlyCreatedTurqualityTaskId && selectedTaskAssignees.length > 0) { // Added check for assignees length
      toast({ title: "Atama Yapılmadı", description: "Lütfen en az bir sorumlu seçin veya bu adımı iptal edin.", variant: "warning" });
      // No return here, allow to proceed if user wants to close without assigning
    }
    setIsSubmittingProcess(true);
    try {
      if (newlyCreatedTurqualityTaskId && selectedTaskAssignees.length > 0) {
        await updateTaskAssignees(newlyCreatedTurqualityTaskId, selectedTaskAssignees);
        toast({ title: "Görev Atandı", description: "Turquality görevi seçilen kişilere atandı." });
      } else if (newlyCreatedTurqualityTaskId) { // Task exists but no one selected
        toast({ title: "Bilgi", description: "Turquality görevine kimse atanmadı. Görevi daha sonra manuel olarak atayabilirsiniz.", variant: "default" });
      }
    } catch (error: any) {
      toast({ title: "Görev Atama Hatası", description: error.message || "Görev atanırken bir sorun oluştu.", variant: "destructive" });
    } finally {
      setIsAssignTaskDialogOpen(false);
      setNewlyCreatedTurqualityTaskId(null);
      setSelectedTaskAssignees([]);
      setLastAddedInvoiceId(null); // Clear invoice ID here
      setIsSubmittingProcess(false); // Final reset of submission state
      fetchDashboardData(); 
    }
  };

  const handleTaskAssigneeChangeForDashboard = (userId: string, checked: boolean) => {
    setSelectedTaskAssignees(prev =>
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  return (
    <div className="space-y-6">
      <QuickActions 
        onAddInvoiceClick={() => setIsInvoiceDialogOpen(true)} // Ensure QuickActions correctly wires up
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <WeatherWidget />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <OverviewCard 
            title="Aktif Görevler" 
            IconComponent={ClipboardList} 
            items={activeTasksData.map(mapTaskToOverviewItem)} 
            isLoading={isLoadingActiveTasks}
            emptyMessage="Aktif görev bulunmamaktadır."
            getItemHref={(item) => item.projectId ? `/tasks/${item.id}` : `/tasks/${item.id}`}
          />
          <OverviewCard 
            title="Gecikmiş Görevler" 
            IconComponent={ListTodo} 
            items={overdueTasksData.map(mapTaskToOverviewItem)}
            isLoading={isLoadingOverdueTasks}
            emptyMessage="Gecikmiş görev bulunmamaktadır."
            getItemHref={(item) => item.projectId ? `/tasks/${item.id}` : `/tasks/${item.id}`}
          />
          {isAdminOrMarketingManager && (
            <OverviewCard 
              title="Onay Bekleyen İşler" 
              IconComponent={CheckSquare} 
              items={pendingApprovalsData.map(mapActivityToOverviewItem)}
              isLoading={isLoadingPendingApprovals}
              emptyMessage="Onay bekleyen iş bulunmamaktadır."
              getItemHref={(item) => item.projectId ? `/projects/${item.projectId}` : undefined}
            />
          )}
        </div>
      </div>


      <Dialog open={isInvoiceDialogOpen} onOpenChange={(open) => {
        setIsInvoiceDialogOpen(open);
        if(!open) {
            setPendingInvoiceData(null);
            setLastAddedInvoiceId(null);
            if (!isTurqualityDialogOpen && !isAssignTaskDialogOpen) setIsSubmittingProcess(false); // Reset if flow aborted
        }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Yeni Fatura Ekle (Hızlı Eylem)</DialogTitle>
            <DialogDescription>
              Yeni bir fatura kaydı oluşturmak için lütfen fatura detaylarını girin.
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm 
            onSave={handleSaveInvoiceForDashboard} 
            onClose={() => {
                setIsInvoiceDialogOpen(false);
                setPendingInvoiceData(null);
                setLastAddedInvoiceId(null);
                if (!isTurqualityDialogOpen && !isAssignTaskDialogOpen) setIsSubmittingProcess(false);
            }}
            isSaving={isSubmittingProcess} // Pass down the general submission state
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isTurqualityDialogOpen} onOpenChange={(open) => {
          if (!open && !isAssignTaskDialogOpen) { // Only fully close if not chaining to assign task
            setIsTurqualityDialogOpen(false);
            setPendingInvoiceData(null);
            setLastAddedInvoiceId(null); 
            setIsSubmittingProcess(false); // Reset if flow ends here
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
            <AlertDialogCancel onClick={() => handleTurqualityConfirmationForDashboard(false)} disabled={isSubmittingProcess}>Hayır</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleTurqualityConfirmationForDashboard(true)} disabled={isSubmittingProcess}>
              {isSubmittingProcess && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              setLastAddedInvoiceId(null); // Clear invoice ID when this dialog closes
              setIsSubmittingProcess(false); // Final reset
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
                      id={`dash-assignee-${user.uid}`}
                      checked={selectedTaskAssignees.includes(user.uid)}
                      onCheckedChange={(checked) => handleTaskAssigneeChangeForDashboard(user.uid, Boolean(checked))}
                      disabled={isSubmittingProcess}
                    />
                    <Label htmlFor={`dash-assignee-${user.uid}`} className="font-normal text-sm flex-grow cursor-pointer">
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
                setLastAddedInvoiceId(null);
                setIsSubmittingProcess(false); // Reset if cancelled
            }} disabled={isSubmittingProcess}>
                İptal / Daha Sonra Ata
            </Button>
            <Button onClick={handleAssignTaskAndCloseForDashboard} disabled={isSubmittingProcess || isLoadingUsersForAssignment}>
              {isSubmittingProcess && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ata ve Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
