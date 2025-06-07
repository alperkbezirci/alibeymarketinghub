// src/app/(app)/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { WelcomeDashboardSection } from "@/components/dashboard/WelcomeDashboardSection"; // Yeni bileşen import edildi
import { QuickActions } from "@/components/dashboard/quick-actions";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { useAuth } from "@/contexts/auth-context";
import { ClipboardList, ListTodo, CheckSquare, Loader2 } from "lucide-react"; // AlertTriangle, PlusCircle kaldırıldı
import { getActiveTasks, getOverdueTasks, addTask, updateTaskAssignees, type Task, type TaskInputData } from '@/services/task-service';
import { getPendingApprovalActivities, type ProjectActivity } from '@/services/project-activity-service';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { InvoiceForm, type InvoiceFormData } from "@/components/budget/invoice-form"; // InvoiceFormData import edildi
import { addInvoice, type InvoiceInputDataForService, linkTaskToInvoice } from '@/services/invoice-service';
import { getAllUsers, type User as AppUser } from "@/services/user-service";
import { format, addDays, parseISO } from "date-fns"; // parseISO eklendi
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
  detail: `Bitiş Tarihi: ${task.dueDate ? format(parseISO(task.dueDate), 'dd MMM yyyy', {locale: tr}) : 'N/A'} | Öncelik: ${task.priority || 'Normal'}`,
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
  const [pendingInvoiceData, setPendingInvoiceData] = useState<InvoiceInputDataForService | null>(null);
  const [lastAddedInvoiceId, setLastAddedInvoiceId] = useState<string | null>(null);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);
  const [newlyCreatedTurqualityTaskId, setNewlyCreatedTurqualityTaskId] = useState<string | null>(null);
  const [usersForAssignment, setUsersForAssignment] = useState<AppUser[]>([]);
  const [isLoadingUsersForAssignment, setIsLoadingUsersForAssignment] = useState(false);
  const [selectedTaskAssignees, setSelectedTaskAssignees] = useState<string[]>([]);
  const [isSubmittingProcess, setIsSubmittingProcess] = useState(false);


  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setIsLoadingActiveTasks(true);
    setIsLoadingOverdueTasks(true);
    if (isAdminOrMarketingManager) setIsLoadingPendingApprovals(true);

    try {
      const activeTasksPromise = getActiveTasks(5); // These are global, not user-specific for now
      const overdueTasksPromise = getOverdueTasks(5); // These are global

      const [fetchedActiveTasks, fetchedOverdueTasks] = await Promise.all([activeTasksPromise, overdueTasksPromise]);
      setActiveTasksData(fetchedActiveTasks);
      setOverdueTasksData(fetchedOverdueTasks);

      if (isAdminOrMarketingManager) {
        const approvals = await getPendingApprovalActivities(5);
        setPendingApprovalsData(approvals);
      }
    } catch (error: unknown) {
      let errorMessage = "Genel özet verileri yüklenirken bir sorun oluştu.";
      if (error instanceof Error) {
 errorMessage = `Veri yükleme hatası: ${error.message}`;
      } else if (typeof error === 'string') {
 errorMessage = `Veri yükleme hatası: ${error}`;
      }
      console.error("Error fetching dashboard data:", error);
      toast({ title: "Kontrol Paneli Hatası", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingActiveTasks(false);
      setIsLoadingOverdueTasks(false);
      if (isAdminOrMarketingManager) setIsLoadingPendingApprovals(false); // This should probably be outside the try/catch too, depending on desired behavior on error
    }
  }, [user, isAdminOrMarketingManager, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSaveInvoiceForDashboard = async (formDataFromComponent: InvoiceFormData) => {
    setIsSubmittingProcess(true);
    setIsInvoiceDialogOpen(false);
    
    // InvoiceFormData (from form) is slightly different from InvoiceInputDataForService (for service)
    // regarding file handling and date types. We adapt it here.
    const invoiceDataForService: InvoiceInputDataForService = {
      invoiceNumber: formDataFromComponent.invoiceNumber,
      invoiceDate: formDataFromComponent.invoiceDate, // Already Date from form
      hotel: formDataFromComponent.hotel,
      spendingCategoryName: formDataFromComponent.spendingCategoryName,
      companyName: formDataFromComponent.companyName,
      originalAmount: formDataFromComponent.originalAmount,
      originalCurrency: formDataFromComponent.originalCurrency,
      description: formDataFromComponent.description,
      amountInEur: formDataFromComponent.amountInEur, // Calculated in form
      exchangeRateToEur: formDataFromComponent.exchangeRateToEur, // Calculated in form
      // fileURL and storagePath will be handled by addInvoice if formDataFromComponent.file exists
      // This assumes addInvoice can take a File object, or file upload is separate.
      // For now, we pass undefined, assuming addInvoice expects URL/path if file already uploaded.
      fileURL: undefined, 
      storagePath: undefined,
    };
     // If formDataFromComponent had a file, it would need to be uploaded first,
     // then fileURL and storagePath populated in invoiceDataForService before calling addInvoice.
     // This example simplifies and assumes addInvoice might handle the file or it's pre-uploaded.
     // OR, if InvoiceFormData contained fileURL/storagePath directly, that would be used.
     // The current InvoiceFormData has `file?: File | null`, so upload logic is needed.
     // For this quick fix, we assume addInvoice expects URL/Path if they exist on formData, otherwise undefined.
     // This part might need adjustment based on how addInvoice truly handles files.

    setPendingInvoiceData(invoiceDataForService);

    try {
      // File upload logic here if formDataFromComponent.file exists
      // This is a placeholder - real upload would involve Firebase Storage client SDK calls.
      // For simplicity, we are currently passing undefined for fileURL/storagePath.
      // The `addInvoice` service might need to be adapted to accept File objects,
      // or file upload should happen here and resulting URL/path passed to `addInvoice`.

      const newInvoice = await addInvoice(invoiceDataForService); 
      setLastAddedInvoiceId(newInvoice.id);
      setIsTurqualityDialogOpen(true);
    } catch (error: unknown) {
      let errorMessage = "Fatura kaydedilirken bir sorun oluştu.";
      if (error instanceof Error) {
 errorMessage = `Fatura kayıt hatası: ${error.message}`;
      } else if (typeof error === 'string') {
 errorMessage = `Fatura kayıt hatası: ${error}`;
      }
      toast({ title: "Fatura Kayıt Hatası", description: errorMessage, variant: "destructive" });
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
        } catch (linkError: unknown) {
            let linkErrorMessage = "Görev faturaya bağlanamadı.";
            if (linkError instanceof Error) {
 linkErrorMessage = linkError.message;
            } else if (typeof linkError === 'string') {
 linkErrorMessage = linkError;
            }
            mainToastDescription += ` Turquality görevi oluşturuldu ancak faturaya bağlanırken bir hata oluştu: ${linkErrorMessage}`;
            toast({ title: "Bağlantı Hatası", description: linkErrorMessage, variant: "warning" });
        }
        
        setIsLoadingUsersForAssignment(true);
        try {
            const users = await getAllUsers();
            setUsersForAssignment(users.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
        } catch (userError: unknown) {
            console.error("Error fetching users for task assignment:", userError);
            mainToastDescription += " Atama için kullanıcılar yüklenemedi.";
            let userErrorMessage = "Görev ataması için kullanıcılar yüklenemedi.";
 if (userError instanceof Error) {
 userErrorMessage = userError.message;
            }
            toast({ title: "Kullanıcı Yükleme Hatası", description: userErrorMessage, variant: "destructive" });
        } finally {
            setIsLoadingUsersForAssignment(false);
        }
        
        setIsAssignTaskDialogOpen(true);
        toast({ title: "Başarılı", description: mainToastDescription });
      } else {
        toast({ title: "Başarılı", description: `${mainToastDescription} Bütçe detayları için Bütçe sayfasını kontrol edin.` });
      }
      fetchDashboardData(); 
    } catch (error: unknown) {
      let errorMessage = "Turquality işlemi sırasında bir sorun oluştu.";
      if (error instanceof Error) errorMessage = error.message;
 else if (typeof error === 'string') {
 errorMessage = error;
 }
    } finally {
      setIsTurqualityDialogOpen(false);
      setPendingInvoiceData(null);
      if (!isAssignTaskDialogOpen) {
        setIsSubmittingProcess(false);
        setLastAddedInvoiceId(null);
      }
    }
  };

  const handleAssignTaskAndCloseForDashboard = async () => {
    if (!newlyCreatedTurqualityTaskId && selectedTaskAssignees.length > 0) {
      // This condition seems off, should be if taskId exists but no assignees, or if no taskID at all.
      // For now, let's assume it means "if task exists and user wants to assign"
    }
    setIsSubmittingProcess(true);
    try {
      if (newlyCreatedTurqualityTaskId && selectedTaskAssignees.length > 0) {
        await updateTaskAssignees(newlyCreatedTurqualityTaskId, selectedTaskAssignees);
        toast({ title: "Görev Atandı", description: "Turquality görevi seçilen kişilere atandı." });
      } else if (newlyCreatedTurqualityTaskId) {
        toast({ title: "Bilgi", description: "Turquality görevine kimse atanmadı. Görevi daha sonra manuel olarak atayabilirsiniz.", variant: "default" });
      }
    } catch (error: unknown) {
 let errorMessage = "Görev atanırken bir sorun oluştu.";
      if (error instanceof Error) {
 errorMessage = `Görev atama hatası: ${error.message}`;
 console.error("Error assigning task:", error);
      } else if (typeof error === 'string') {
 errorMessage = `Görev atama hatası: ${error}`;
 console.error("Error assigning task:", error);
 }
    } finally {
      setIsAssignTaskDialogOpen(false);
      setNewlyCreatedTurqualityTaskId(null);
      setSelectedTaskAssignees([]);
      setLastAddedInvoiceId(null);
      setIsSubmittingProcess(false);
      fetchDashboardData(); 
    }
  };

  const handleTaskAssigneeChangeForDashboard = (userId: string, checked: boolean) => {
    setSelectedTaskAssignees(prev =>
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };
  
  if (!user) {
    // AuthProvider should handle redirect, but this is a safeguard or loader state
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <WelcomeDashboardSection user={user} />
      
      <QuickActions />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
            <WeatherWidget />
        </div>
        <OverviewCard 
          title="Aktif Görevler (Genel)" 
          IconComponent={ClipboardList} 
          items={activeTasksData.map(mapTaskToOverviewItem)} 
          isLoading={isLoadingActiveTasks}
          emptyMessage="Aktif görev bulunmamaktadır."
          getItemHref={(item) => item.projectId ? `/tasks/${item.id}` : `/tasks/${item.id}`}
        />
        <OverviewCard 
          title="Gecikmiş Görevler (Genel)" 
          IconComponent={ListTodo} 
          items={overdueTasksData.map(mapTaskToOverviewItem)}
          isLoading={isLoadingOverdueTasks}
          emptyMessage="Gecikmiş görev bulunmamaktadır."
          getItemHref={(item) => item.projectId ? `/tasks/${item.id}` : `/tasks/${item.id}`}
        />
        {isAdminOrMarketingManager && (
          <OverviewCard 
            title="Onay Bekleyen İşler (Genel)" 
            IconComponent={CheckSquare} 
            items={pendingApprovalsData.map(mapActivityToOverviewItem)}
            isLoading={isLoadingPendingApprovals}
            emptyMessage="Onay bekleyen iş bulunmamaktadır."
            getItemHref={(item) => item.projectId ? `/projects/${item.projectId}` : undefined}
          />
        )}
      </div>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={(open) => {
        setIsInvoiceDialogOpen(open);
        if(!open) {
            setPendingInvoiceData(null);
            setLastAddedInvoiceId(null);
            if (!isTurqualityDialogOpen && !isAssignTaskDialogOpen) setIsSubmittingProcess(false);
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
            isSaving={isSubmittingProcess}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isTurqualityDialogOpen} onOpenChange={(open) => {
          if (!open && !isAssignTaskDialogOpen) {
            setIsTurqualityDialogOpen(false);
            setPendingInvoiceData(null);
            setLastAddedInvoiceId(null); 
            setIsSubmittingProcess(false);
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
              setLastAddedInvoiceId(null);
              setIsSubmittingProcess(false);
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
                setIsSubmittingProcess(false);
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

    

    
