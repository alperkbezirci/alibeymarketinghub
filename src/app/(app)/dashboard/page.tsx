
// src/app/(app)/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { WelcomeMessage } from "@/components/dashboard/welcome-message";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { useAuth } from "@/contexts/auth-context";
import { Briefcase, ListTodo, CheckSquare, Loader2, Users, AlertTriangle, PlusCircle, CheckCircle } from "lucide-react";
import { getActiveProjects, type Project } from '@/services/project-service';
import { getOverdueTasks, addTask, updateTaskAssignees, type Task, type TaskInputData } from '@/services/task-service';
import { getPendingApprovalActivities, type ProjectActivity } from '@/services/project-activity-service';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { InvoiceForm } from "@/components/budget/invoice-form";
import { addInvoice, type InvoiceInputData } from '@/services/invoice-service';
import { getAllUsers, type User as AppUser } from "@/services/user-service";
import { format, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button"; // Button import'u eklendi

const TURQUALITY_PROJECT_ID = "xDCcOOdDVUgSs1YUcLoU"; 

export default function DashboardPage() {
  const { user, isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();

  const [activeProjectsData, setActiveProjectsData] = useState<Project[]>([]);
  const [overdueTasksData, setOverdueTasksData] = useState<Task[]>([]);
  const [pendingApprovalsData, setPendingApprovalsData] = useState<ProjectActivity[]>([]);
  
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingPendingApprovals, setIsLoadingPendingApprovals] = useState(true);

  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isTurqualityDialogOpen, setIsTurqualityDialogOpen] = useState(false);
  const [pendingInvoiceData, setPendingInvoiceData] = useState<InvoiceInputData | null>(null);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);
  const [newlyCreatedTurqualityTaskId, setNewlyCreatedTurqualityTaskId] = useState<string | null>(null);
  const [usersForAssignment, setUsersForAssignment] = useState<AppUser[]>([]);
  const [isLoadingUsersForAssignment, setIsLoadingUsersForAssignment] = useState(false);
  const [selectedTaskAssignees, setSelectedTaskAssignees] = useState<string[]>([]);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);


  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setIsLoadingProjects(true);
    setIsLoadingTasks(true);
    if (isAdminOrMarketingManager) setIsLoadingPendingApprovals(true);

    try {
      const projectsPromise = getActiveProjects(5);
      const tasksPromise = getOverdueTasks(5);
      
      const [projects, tasks] = await Promise.all([projectsPromise, tasksPromise]);
      setActiveProjectsData(projects);
      setOverdueTasksData(tasks);

      if (isAdminOrMarketingManager) {
        const approvals = await getPendingApprovalActivities(5);
        setPendingApprovalsData(approvals);
      }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({ title: "Kontrol Paneli Hatası", description: "Veriler yüklenirken bir sorun oluştu.", variant: "destructive" });
    } finally {
      setIsLoadingProjects(false);
      setIsLoadingTasks(false);
      if (isAdminOrMarketingManager) setIsLoadingPendingApprovals(false);
    }
  }, [user, isAdminOrMarketingManager, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSaveInvoiceForDashboard = (formData: InvoiceInputData) => {
    setPendingInvoiceData(formData);
    setIsInvoiceDialogOpen(false);
    setIsTurqualityDialogOpen(true);
  };

  const handleTurqualityConfirmationForDashboard = async (isTurqualityApplicable: boolean) => {
    if (!pendingInvoiceData) return;
    setIsSubmittingInvoice(true);
    const baseDescription = `Fatura No: ${pendingInvoiceData.invoiceNumber}, ${pendingInvoiceData.originalAmount.toLocaleString('tr-TR')} ${pendingInvoiceData.originalCurrency} tutarında eklendi.`;

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
        toast({ title: "Başarılı", description: `${baseDescription} Turquality görevi oluşturuldu.` });
      } else {
        toast({ title: "Başarılı", description: `${baseDescription} Bütçe detayları için Bütçe sayfasını kontrol edin.` });
      }
    } catch (error: any) {
      toast({ title: "Fatura Kayıt Hatası", description: error.message || "Fatura kaydedilirken bir sorun oluştu.", variant: "destructive" });
    } finally {
      setIsTurqualityDialogOpen(false);
      setPendingInvoiceData(null);
      setIsSubmittingInvoice(false);
    }
  };

  const handleAssignTaskAndCloseForDashboard = async () => {
    if (!newlyCreatedTurqualityTaskId || selectedTaskAssignees.length === 0) {
      toast({ title: "Atama Yapılmadı", description: "Lütfen en az bir sorumlu seçin veya bu adımı iptal edin.", variant: "destructive" });
      return;
    }
    setIsSubmittingInvoice(true);
    try {
      await updateTaskAssignees(newlyCreatedTurqualityTaskId, selectedTaskAssignees);
      toast({ title: "Görev Atandı", description: "Turquality görevi seçilen kişilere atandı." });
    } catch (error: any) {
      toast({ title: "Görev Atama Hatası", description: error.message || "Görev atanırken bir sorun oluştu.", variant: "destructive" });
    } finally {
      setIsAssignTaskDialogOpen(false);
      setNewlyCreatedTurqualityTaskId(null);
      setSelectedTaskAssignees([]);
      setIsSubmittingInvoice(false);
    }
  };

  const handleTaskAssigneeChangeForDashboard = (userId: string, checked: boolean) => {
    setSelectedTaskAssignees(prev =>
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    );
  };

  const mapProjectToOverviewItem = (project: Project) => ({
    id: project.id,
    name: project.projectName || 'İsimsiz Proje',
    detail: `Durum: ${project.status || 'Bilinmiyor'} | Otel: ${project.hotel || 'Belirtilmemiş'}`,
  });

  const mapTaskToOverviewItem = (task: Task) => ({
    id: task.id,
    name: task.taskName || 'İsimsiz Görev',
    detail: `Bitiş Tarihi: ${task.dueDate ? format(new Date(task.dueDate), 'dd MMM yyyy', {locale: tr}) : 'N/A'} | Öncelik: ${task.priority || 'Normal'}`,
  });

  const mapActivityToOverviewItem = (activity: ProjectActivity) => ({
    id: activity.id,
    name: `Proje: ${activity.projectId.substring(0,6)}... - Kullanıcı: ${activity.userName}`,
    detail: `Tip: ${activity.type === 'comment' ? 'Yorum' : 'Dosya'} | İçerik: ${activity.content?.substring(0, 30) || activity.fileName || 'Detay Yok'}...`,
  });

  return (
    <div className="space-y-6">
      <WelcomeMessage />
      <QuickActions 
        onAddInvoiceClick={() => setIsInvoiceDialogOpen(true)}
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <OverviewCard 
          title="Aktif Projeler" 
          IconComponent={Briefcase} 
          items={activeProjectsData.map(mapProjectToOverviewItem)} 
          isLoading={isLoadingProjects}
          emptyMessage="Aktif proje bulunmamaktadır." 
        />
        <OverviewCard 
          title="Gecikmiş Görevler" 
          IconComponent={ListTodo} 
          items={overdueTasksData.map(mapTaskToOverviewItem)}
          isLoading={isLoadingTasks}
          emptyMessage="Gecikmiş görev bulunmamaktadır." 
        />
        {isAdminOrMarketingManager && (
          <OverviewCard 
            title="Onay Bekleyen İşler" 
            IconComponent={CheckSquare} 
            items={pendingApprovalsData.map(mapActivityToOverviewItem)}
            isLoading={isLoadingPendingApprovals}
            emptyMessage="Onay bekleyen iş bulunmamaktadır." 
          />
        )}
      </div>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Yeni Fatura Ekle (Hızlı Eylem)</DialogTitle>
            <DialogDescription>
              Yeni bir fatura kaydı oluşturmak için lütfen fatura detaylarını girin.
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm onSave={handleSaveInvoiceForDashboard} onClose={() => setIsInvoiceDialogOpen(false)} />
        </DialogContent>
      </Dialog>

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
            <AlertDialogCancel onClick={() => handleTurqualityConfirmationForDashboard(false)} disabled={isSubmittingInvoice}>Hayır</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleTurqualityConfirmationForDashboard(true)} disabled={isSubmittingInvoice}>
              {isSubmittingInvoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                      id={`dash-assignee-${user.uid}`}
                      checked={selectedTaskAssignees.includes(user.uid)}
                      onCheckedChange={(checked) => handleTaskAssigneeChangeForDashboard(user.uid, Boolean(checked))}
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
            }} disabled={isSubmittingInvoice}>
                İptal / Daha Sonra Ata
            </Button>
            <Button onClick={handleAssignTaskAndCloseForDashboard} disabled={isSubmittingInvoice || isLoadingUsersForAssignment || selectedTaskAssignees.length === 0}>
              {isSubmittingInvoice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ata ve Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    

    