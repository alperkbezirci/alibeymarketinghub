// src/app/(app)/projects/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useActionState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { getProjectById, type Project } from '@/services/project-service';
import { getAllUsers, type User as AppUser } from '@/services/user-service';
import { getTasksByProjectId, type Task } from '@/services/task-service';
import { getProjectActivities, type ProjectActivity, type ProjectActivityStatus } from '@/services/project-activity-service';
import { handleAddProjectActivityAction, handleUpdateActivityStatusAction, handleApproveActivityAction, handleRejectActivityAction } from './actions';
import { useAuth } from '@/contexts/auth-context';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from "@/components/ui/button"; 
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, ArrowLeft, Users, CalendarDays, Info, Hotel, GitBranch, Paperclip, MessageSquare, Send, Edit, CheckCircle, AlertCircle, Clock, ThumbsUp, Loader2, SmilePlus, ThumbsDown, UploadCloud } from 'lucide-react'; 
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/layout/app-logo'; // AppLogo import edildi
import { GlobalLoader } from '@/components/layout/global-loader'; // GlobalLoader import edildi


function SubmitActivityButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Gönder
    </Button>
  );
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAdminOrMarketingManager } = useAuth(); 
  const { toast } = useToast();
  const projectId = typeof params.id === 'string' ? params.id : undefined;

  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [projectActivities, setProjectActivities] = useState<ProjectActivity[]>([]);

  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [addActivityState, handleAddActivitySubmit] = useActionState(handleAddProjectActivityAction, undefined);
  const activityFormRef = React.useRef<HTMLFormElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedActivityFileName, setSelectedActivityFileName] = useState<string | null>(null);
  const [idTokenForActivityForm, setIdTokenForActivityForm] = useState<string>('');

  const [activityToApprove, setActivityToApprove] = useState<ProjectActivity | null>(null);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const [activityForDecision, setActivityForDecision] = useState<ProjectActivity | null>(null);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | null>(null);
  const [managerFeedbackInput, setManagerFeedbackInput] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  useEffect(() => {
    if (currentUser) {
      currentUser.getIdToken().then(token => {
        setIdTokenForActivityForm(token);
      }).catch(err => {
        console.error("Error getting ID token for activity form:", err);
        toast({ title: "Kimlik Doğrulama Hatası", description: "Form gönderimi için kullanıcı kimliği alınamadı.", variant: "destructive" });
      });
    }
  }, [currentUser, toast]);


  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) {
      setError("Proje ID'si bulunamadı.");
      setIsLoadingProject(false);
      return;
    }
    setIsLoadingProject(true);
    setError(null);
    try {
      const fetchedProject = await getProjectById(projectId);
      setProject(fetchedProject);
      if (fetchedProject) {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      }
    } catch (err: any) {
      console.error("Error fetching project details:", err);
      setError(err.message || `Proje (ID: ${projectId}) detayları yüklenirken bir hata oluştu.`);
      toast({ title: "Proje Yükleme Hatası", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingProject(false);
    }
  }, [projectId, toast]);

  const fetchTasksForProject = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingTasks(true);
    try {
      const tasks = await getTasksByProjectId(projectId);
      setProjectTasks(tasks);
    } catch (err: any) {
      console.error("Error fetching project tasks:", err);
      let userFriendlyMessage = "Projeye ait görevler yüklenirken bir hata oluştu. ";
      if (err.message && (err.message.includes("index required") || err.message.includes("needs an index"))) {
          userFriendlyMessage += "Bu, genellikle Firestore'da eksik bir veritabanı indeksi anlamına gelir. Lütfen tarayıcı konsolundaki orijinal hata mesajını kontrol edin; orada indeksi oluşturmak için bir bağlantı olabilir.";
      } else {
          userFriendlyMessage += "Daha fazla bilgi için tarayıcı konsolunu kontrol edin.";
      }
      toast({ title: "Görev Yükleme Hatası", description: userFriendlyMessage, variant: "destructive", duration: 15000 });
    } finally {
      setIsLoadingTasks(false);
    }
  }, [projectId, toast]);

  const fetchActivitiesForProject = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingActivities(true);
    try {
      const activities = await getProjectActivities(projectId);
      setProjectActivities(activities);
    } catch (err: any) {
      console.error("Error fetching project activities:", err);
      let userFriendlyMessage = "Proje aktiviteleri yüklenirken bir hata oluştu. ";
       if (err.message && (err.message.includes("index required") || err.message.includes("needs an index"))) {
          userFriendlyMessage += "Bu, genellikle Firestore'da eksik bir veritabanı indeksi anlamına gelir. Lütfen tarayıcı konsolundaki orijinal hata mesajını kontrol edin; orada indeksi oluşturmak için bir bağlantı olabilir.";
      } else {
          userFriendlyMessage += "Daha fazla bilgi için tarayıcı konsolunu kontrol edin.";
      }
      toast({ title: "Aktivite Yükleme Hatası", description: userFriendlyMessage, variant: "destructive", duration: 15000 });
    } finally {
      setIsLoadingActivities(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchProjectDetails();
    fetchTasksForProject();
    fetchActivitiesForProject();
  }, [fetchProjectDetails, fetchTasksForProject, fetchActivitiesForProject]);

  useEffect(() => {
    if (addActivityState?.message) {
      if (addActivityState.success) {
        toast({ title: "Başarılı", description: addActivityState.message });
        activityFormRef.current?.reset();
        if(fileInputRef.current) fileInputRef.current.value = "";
        setSelectedActivityFileName(null); 
        fetchActivitiesForProject();
        if (currentUser) {
          currentUser.getIdToken(true).then(token => { 
            setIdTokenForActivityForm(token);
          }).catch(err => console.error("Error refreshing ID token:", err));
        }
      } else {
        toast({ title: "Hata", description: addActivityState.message, variant: "destructive" });
      }
    }
  }, [addActivityState, toast, fetchActivitiesForProject, currentUser]);


  const handleSendForApproval = async () => {
    if (!activityToApprove || !projectId) return;
    setIsSubmittingApproval(true);
    const result = await handleUpdateActivityStatusAction(activityToApprove.id, projectId, 'pending_approval', approvalMessage);
    if (result.success) {
        toast({ title: "Başarılı", description: result.message });
        fetchActivitiesForProject(); 
        setActivityToApprove(null); 
        setApprovalMessage("");     
    } else {
        toast({ title: "Hata", description: result.message, variant: "destructive" });
    }
    setIsSubmittingApproval(false);
  };

  const handleManagerDecision = async () => {
    if (!activityForDecision || !decisionType || !projectId) return;
    setIsSubmittingDecision(true);

    let result;
    if (decisionType === 'approve') {
      result = await handleApproveActivityAction(activityForDecision.id, projectId, managerFeedbackInput);
    } else { 
      result = await handleRejectActivityAction(activityForDecision.id, projectId, managerFeedbackInput);
    }

    if (result.success) {
      toast({ title: "Başarılı", description: result.message });
      fetchActivitiesForProject();
      setActivityForDecision(null);
      setDecisionType(null);
      setManagerFeedbackInput("");
    } else {
      toast({ title: "Hata", description: result.message, variant: "destructive" });
    }
    setIsSubmittingDecision(false);
  };


  const formatDateDisplay = (dateInput: string | undefined | null, dateFormat: string = 'dd MMMM yyyy, EEEE') => {
    if (!dateInput) return 'Belirtilmemiş';
    try {
      return format(new Date(dateInput), dateFormat, { locale: tr });
    } catch (e) {
      return 'Geçersiz Tarih';
    }
  };

  const formatRelativeTime = (dateInput: string | undefined | null) => {
    if (!dateInput) return '';
    try {
      return formatDistanceToNow(new Date(dateInput), { addSuffix: true, locale: tr });
    } catch (e) {
      return '';
    }
  };

  const getResponsiblePersonNames = () => {
    if (!project || !project.responsiblePersons || project.responsiblePersons.length === 0) {
      return 'Atanmamış';
    }
    return project.responsiblePersons.map(uid => {
      const user = users.find(u => u.uid === uid);
      return user ? `${user.firstName} ${user.lastName}` : `Kullanıcı (ID: ${uid.substring(0,6)}...)`;
    }).join(', ');
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-500 hover:bg-gray-600';
    switch (status) {
      case 'Tamamlandı': return 'bg-green-500 hover:bg-green-600';
      case 'Devam Ediyor': return 'bg-blue-500 hover:bg-blue-600';
      case 'Planlama': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Beklemede': return 'bg-orange-500 hover:bg-orange-600';
      case 'İptal Edildi': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getActivityStatusInfo = (status: ProjectActivityStatus | undefined) => {
    if (!status) return { text: 'Bilinmiyor', icon: Info, color: 'bg-gray-500 text-gray-foreground', iconColor: 'text-gray-500' };
    switch (status) {
      case 'draft': return { text: 'Taslak', icon: Edit, color: 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300', iconColor: 'text-yellow-500' };
      case 'pending_approval': return { text: 'Onay Bekliyor', icon: Clock, color: 'bg-orange-100 dark:bg-orange-800/30 text-orange-700 dark:text-orange-300', iconColor: 'text-orange-500' };
      case 'approved': return { text: 'Onaylandı', icon: CheckCircle, color: 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300', iconColor: 'text-green-500' };
      case 'rejected': return { text: 'Reddedildi', icon: AlertCircle, color: 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300', iconColor: 'text-red-500' };
      case 'information': return { text: 'Bilgi', icon: Info, color: 'bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300', iconColor: 'text-blue-500' };
      default: return { text: status, icon: Info, color: 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300', iconColor: 'text-gray-500' };
    }
  };


  if (isLoadingProject || isLoadingTasks || isLoadingActivities) {
    return <GlobalLoader message="Proje detayları yükleniyor..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AppLogo className="h-16 w-auto text-destructive mb-4" />
        <AlertTriangle className="w-12 h-12 text-destructive mb-3" />
        <h2 className="text-2xl font-semibold mb-2">Hata</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push('/projects')}>Proje Listesine Dön</Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AppLogo className="h-16 w-auto text-muted-foreground mb-4" />
        <AlertTriangle className="w-12 h-12 text-destructive mb-3" />
        <h2 className="text-2xl font-semibold mb-2">Proje Bulunamadı</h2>
        <p className="text-muted-foreground mb-4">Aradığınız proje mevcut değil veya silinmiş olabilir.</p>
        <Button onClick={() => router.push('/projects')}>Proje Listesine Dön</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/projects')} className="mb-4 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" /> Proje Listesine Dön
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg print:shadow-none">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <CardTitle className="font-headline text-3xl mb-1">{project.projectName}</CardTitle>
                  <CardDescription className="text-base flex items-center">
                    <Hotel className="mr-2 h-4 w-4 text-muted-foreground" /> {project.hotel || 'Belirtilmemiş'}
                  </CardDescription>
                </div>
                {project.status && <Badge className={cn("text-sm px-3 py-1", getStatusColor(project.status))}>{project.status}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-sm sm:text-base">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary" />Tarihler</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm pl-7">
                  <p><span className="font-medium text-muted-foreground">Başlangıç:</span> {formatDateDisplay(project.startDate)}</p>
                  <p><span className="font-medium text-muted-foreground">Bitiş:</span> {formatDateDisplay(project.endDate)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Sorumlu Kişiler</h3>
                <p className="text-sm pl-7">{getResponsiblePersonNames()}</p>
              </div>

              {project.description && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center"><Info className="mr-2 h-5 w-5 text-primary" />Açıklama</h3>
                  <p className="text-sm pl-7 whitespace-pre-line leading-relaxed">{project.description}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t mt-6">
                <p>Oluşturulma Tarihi: {formatDateDisplay(project.createdAt, 'dd.MM.yyyy HH:mm')}</p>
                {project.updatedAt && project.updatedAt !== project.createdAt && <p>Son Güncelleme: {formatDateDisplay(project.updatedAt, 'dd.MM.yyyy HH:mm')}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end print:hidden">
              <Button variant="outline" onClick={() => toast({title: "Düzenleme Modu", description:"Proje düzenleme formu burada açılacak."})}>
                <Edit className="mr-2 h-4 w-4" /> Projeyi Düzenle
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg print:shadow-none">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center"><GitBranch className="mr-2 h-5 w-5 text-primary" />Bağlı Görevler</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              ) : projectTasks.length > 0 ? (
                <ul className="space-y-3">
                  {projectTasks.map(task => (
                    <li key={task.id} className="p-3 border rounded-md hover:shadow-md transition-shadow bg-card/50">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-semibold text-base">{task.taskName}</p>
                        <Badge variant={task.status === "Tamamlandı" ? "default" : "secondary"}>{task.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Bitiş Tarihi: {formatDateDisplay(task.dueDate, 'dd MMM yyyy')}</p>
                      {task.assignedTo && task.assignedTo.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Atanan: {task.assignedTo.map(uid => {
                            const user = users.find(u => u.uid === uid);
                            return user ? `${user.firstName} ${user.lastName}` : `Kullanıcı (ID: ${uid.substring(0,6)}...)`;
                          }).join(', ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Bu projeye bağlı görev bulunmamaktadır.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6 print:hidden">
          <Card className="shadow-lg sticky top-20">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary" />Proje Akışı & Yorumlar</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <form action={handleAddActivitySubmit} ref={activityFormRef} className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/20">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="idToken" value={idTokenForActivityForm} />

                <div>
                  <Label htmlFor="activityContent" className="sr-only">Yorumunuz</Label>
                  <Textarea
                    id="activityContent"
                    name="content"
                    placeholder="Proje hakkında bir güncelleme, yorum veya soru yazın..."
                    rows={3}
                    className="bg-background"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-grow space-y-1">
                        <Label htmlFor="activityFile" className="text-xs font-medium">Dosya Ekle (Opsiyonel)</Label>
                        <Input 
                            id="activityFile" 
                            name="file" 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden"
                            onChange={(e) => setSelectedActivityFileName(e.target.files?.[0]?.name || null)}
                        />
                        <Label
                            htmlFor="activityFile"
                            className={cn(
                                buttonVariants({ variant: "outline" }),
                                "cursor-pointer w-full sm:w-auto justify-center flex items-center" 
                            )}
                        >
                            <UploadCloud className="mr-2 h-4 w-4" />
                            Dosya Seç
                        </Label>
                        {selectedActivityFileName ? (
                            <p className="text-xs text-muted-foreground mt-1">Seçilen: {selectedActivityFileName}</p>
                        ) : (
                            <p className="text-xs text-muted-foreground mt-1">Dosya seçilmedi.</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Dosya yükleme işlevi tam olarak aktif değildir. Şimdilik sadece dosya adı kaydedilir.</p>
                    </div>
                    <SubmitActivityButton />
                </div>
              </form>

              <h4 className="text-md font-semibold mb-3 mt-6 border-t pt-4">Geçmiş Aktiviteler</h4>
              {isLoadingActivities ? (
                <div className="space-y-4">
                    {[1,2,3].map(i => (
                        <div key={i} className="flex items-start space-x-3 p-3 border rounded-md bg-background/30 animate-pulse">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
              ) : projectActivities.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px] pr-1">
                  <ul className="space-y-4">
                    {projectActivities.map(activity => {
                      const activityStatusInfo = getActivityStatusInfo(activity.status);
                      const Icon = activityStatusInfo.icon;
                      const isCurrentUserAuthor = activity.userId === currentUser?.uid;

                      return (
                        <li key={activity.id} className="flex space-x-3 p-3.5 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow duration-200">
                           <Avatar className="h-10 w-10 border mt-0.5">
                            <AvatarImage src={activity.userPhotoURL || `https://placehold.co/40x40.png`} alt={activity.userName} data-ai-hint="user avatar" />
                            <AvatarFallback>{activity.userName?.substring(0,1).toUpperCase() || 'K'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                               <p className="text-sm font-semibold text-card-foreground">{activity.userName}</p>
                               <p className="text-xs text-muted-foreground" title={formatDateDisplay(activity.createdAt, 'dd MMMM yyyy, HH:mm:ss')}>
                                {formatRelativeTime(activity.createdAt)}
                               </p>
                            </div>

                            {activity.type === 'comment' && activity.content &&
                                <p className="text-sm text-foreground/90 mt-1 whitespace-pre-line leading-relaxed">{activity.content}</p>
                            }
                            {activity.type === 'file_upload' && (
                              <div className="mt-1.5 p-2.5 border rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
                                <div className="flex items-center text-sm">
                                    <Paperclip className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground/90">{activity.fileName}</span>
                                </div>
                                {activity.fileType && <p className="text-xs text-muted-foreground ml-6">{activity.fileType}</p>}
                                {activity.content && <p className="text-xs text-muted-foreground mt-1 ml-6 pt-1 border-t border-dashed">{activity.content}</p>}
                              </div>
                            )}

                            <div className={cn("flex items-center justify-between mt-2.5 pt-2 border-t border-dashed", activity.status === 'pending_approval' && isAdminOrMarketingManager ? "flex-wrap gap-y-2" : "")}>
                                <Badge variant="outline" className={cn("text-xs font-medium py-0.5 px-2", activityStatusInfo.color)}>
                                    <Icon className={cn("mr-1.5 h-3.5 w-3.5", activityStatusInfo.iconColor)} />
                                    {activityStatusInfo.text}
                                </Badge>
                                {activity.status === 'draft' && isCurrentUserAuthor && (
                                    <Dialog open={activityToApprove?.id === activity.id} onOpenChange={(open) => {
                                        if (open) {
                                            setActivityToApprove(activity);
                                            setApprovalMessage(activity.messageForManager || "");
                                        } else {
                                            setActivityToApprove(null);
                                            setApprovalMessage("");
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="xs" className="text-xs h-7 px-2 py-1 text-primary hover:bg-primary/5 border-primary/50">
                                                <ThumbsUp className="mr-1 h-3.5 w-3.5" /> Onaya Gönder
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle className="font-headline text-xl">İçeriği Onaya Gönder</DialogTitle>
                                                <DialogDescription>
                                                  Aşağıdaki güncellemeyi Pazarlama Müdürü'ne onaya göndermek üzeresiniz. İsteğe bağlı bir mesaj ekleyebilirsiniz.
                                                  <blockquote className="mt-2 p-2 border-l-4 bg-muted text-sm italic">
                                                    {activity.content ? `"${activity.content.substring(0,100)}${activity.content.length > 100 ? "..." : ""}"`
                                                                    : `Dosya: "${activity.fileName}"`}
                                                  </blockquote>
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-2">
                                                <Label htmlFor="approvalMessage" className="text-sm font-medium">Yönetici için Mesaj (Opsiyonel)</Label>
                                                <Textarea
                                                    id="approvalMessage"
                                                    placeholder="Onaylayan kişiye iletmek istediğiniz notlar..."
                                                    value={approvalMessage}
                                                    onChange={(e) => setApprovalMessage(e.target.value)}
                                                    rows={3}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="ghost" disabled={isSubmittingApproval}>İptal</Button>
                                                </DialogClose>
                                                <Button onClick={handleSendForApproval} disabled={isSubmittingApproval}>
                                                    {isSubmittingApproval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Gönder
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                                {activity.status === 'pending_approval' && isAdminOrMarketingManager && (
                                    <div className="flex space-x-2 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                                        <Button variant="outline" size="xs" className="text-xs h-7 px-2 py-1 text-red-600 hover:bg-red-500/10 border-red-500/50"
                                            onClick={() => { setActivityForDecision(activity); setDecisionType('reject'); setManagerFeedbackInput(activity.managerFeedback || ""); }}>
                                            <ThumbsDown className="mr-1 h-3.5 w-3.5" /> Reddet
                                        </Button>
                                        <Button variant="outline" size="xs" className="text-xs h-7 px-2 py-1 text-green-600 hover:bg-green-500/10 border-green-500/50"
                                            onClick={() => { setActivityForDecision(activity); setDecisionType('approve'); setManagerFeedbackInput(activity.managerFeedback || ""); }}>
                                            <ThumbsUp className="mr-1 h-3.5 w-3.5" /> Onayla
                                        </Button>
                                    </div>
                                )}
                            </div>
                            {activity.status === 'pending_approval' && activity.messageForManager && (
                                <p className="text-xs italic text-muted-foreground mt-1.5 border-l-2 border-orange-400 dark:border-orange-600 pl-2 py-1 bg-orange-50 dark:bg-orange-900/30 rounded-r-md">
                                  <span className="font-semibold not-italic">Kullanıcı Notu:</span> {activity.messageForManager}
                                </p>
                            )}
                             {activity.status === 'rejected' && activity.managerFeedback && (
                                <p className="text-xs italic text-muted-foreground mt-1.5 border-l-2 border-red-400 dark:border-red-600 pl-2 py-1 bg-red-50 dark:bg-red-900/30 rounded-r-md">
                                  <span className="font-semibold not-italic">Yönetici Geri Bildirimi:</span> {activity.managerFeedback}
                                </p>
                            )}
                             {activity.status === 'approved' && activity.managerFeedback && (
                                <p className="text-xs italic text-muted-foreground mt-1.5 border-l-2 border-green-400 dark:border-green-600 pl-2 py-1 bg-green-50 dark:bg-green-900/30 rounded-r-md">
                                  <span className="font-semibold not-italic">Yönetici Geri Bildirimi:</span> {activity.managerFeedback}
                                </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              ) : (
                <div className="text-center py-10">
                    <SmilePlus className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">Bu proje için henüz bir aktivite (yorum, dosya vb.) bulunmamaktadır.</p>
                    <p className="text-xs text-muted-foreground mt-1">İlk güncellemeyi siz ekleyebilirsiniz!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!activityForDecision && !!decisionType} onOpenChange={(open) => {
        if (!open) {
          setActivityForDecision(null);
          setDecisionType(null);
          setManagerFeedbackInput("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Aktiviteyi {decisionType === 'approve' ? 'Onayla' : 'Reddet'}</DialogTitle>
            <DialogDescription>
              Aşağıdaki aktivite için kararınızı ve isteğe bağlı olarak geri bildiriminizi girin.
              <blockquote className="mt-2 p-2 border-l-4 bg-muted text-sm italic">
                Kullanıcı: {activityForDecision?.userName} <br />
                İçerik: {activityForDecision?.content ? `"${activityForDecision.content.substring(0,100)}${activityForDecision.content.length > 100 ? "..." : ""}"`
                                  : `Dosya: "${activityForDecision?.fileName}"`}
                {activityForDecision?.messageForManager && <><br/>Kullanıcı Notu: {activityForDecision.messageForManager}</>}
              </blockquote>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="managerFeedback" className="text-sm font-medium">Geri Bildirim (Opsiyonel)</Label>
            <Textarea
              id="managerFeedback"
              placeholder="Onay veya red için kullanıcıya iletmek istediğiniz notlar..."
              value={managerFeedbackInput}
              onChange={(e) => setManagerFeedbackInput(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setActivityForDecision(null); setDecisionType(null); setManagerFeedbackInput("");}} disabled={isSubmittingDecision}>İptal</Button>
            <Button 
              onClick={handleManagerDecision} 
              disabled={isSubmittingDecision}
              className={cn(decisionType === 'approve' ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90")}
            >
              {isSubmittingDecision && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {decisionType === 'approve' ? 'Onayla' : 'Reddet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
