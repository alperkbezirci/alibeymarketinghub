
// src/app/(app)/projects/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useActionState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { getProjectById, type Project } from '@/services/project-service';
import { getAllUsers, type User as AppUser } from '@/services/user-service';
import { getTasksByProjectId, type Task } from '@/services/task-service';
import { getProjectActivities, type ProjectActivity, type ProjectActivityStatus } from '@/services/project-activity-service';
import { handleAddProjectActivityAction, handleUpdateActivityStatusAction } from './actions';
import { useAuth } from '@/contexts/auth-context';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, ArrowLeft, Users, CalendarDays, Info, Hotel, GitBranch, Paperclip, MessageSquare, Send, Edit, CheckCircle, AlertCircle, Clock, ThumbsUp, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";


function SubmitActivityButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Gönder
    </Button>
  );
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, getDisplayName } = useAuth(); 
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

  const [addActivityState, handleAddActivitySubmit, isAddActivityPending] = useActionState(handleAddProjectActivityAction, undefined);
  const activityFormRef = React.useRef<HTMLFormElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [activityToApprove, setActivityToApprove] = useState<ProjectActivity | null>(null);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);


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
      if (fetchedProject && fetchedProject.responsiblePersons && fetchedProject.responsiblePersons.length > 0) {
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
      // It's crucial for the user to check their browser console for Firestore index creation links.
      let userFriendlyMessage = "Projeye ait görevler yüklenirken bir hata oluştu. ";
      if (err.message && (err.message.includes("index required") || err.message.includes("needs an index"))) {
          userFriendlyMessage += "Bu, genellikle Firestore'da eksik bir veritabanı indeksi anlamına gelir. Lütfen tarayıcı konsolundaki orijinal hata mesajını kontrol edin; orada indeksi oluşturmak için bir bağlantı olabilir.";
      } else {
          userFriendlyMessage += "Daha fazla bilgi için tarayıcı konsolunu kontrol edin.";
      }
      toast({ title: "Görev Yükleme Hatası", description: userFriendlyMessage, variant: "destructive", duration: 10000 });
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
      toast({ title: "Aktivite Yükleme Hatası", description: userFriendlyMessage, variant: "destructive", duration: 10000 });
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
        fetchActivitiesForProject(); 
      } else {
        toast({ title: "Hata", description: addActivityState.message, variant: "destructive" });
      }
    }
  }, [addActivityState, toast, fetchActivitiesForProject]);


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
  
  const getActivityStatusInfo = (status: ProjectActivityStatus) => {
    switch (status) {
      case 'draft': return { text: 'Taslak', icon: Edit, color: 'bg-yellow-500 text-yellow-foreground' };
      case 'pending_approval': return { text: 'Onay Bekliyor', icon: Clock, color: 'bg-orange-500 text-orange-foreground' };
      case 'approved': return { text: 'Onaylandı', icon: CheckCircle, color: 'bg-green-500 text-green-foreground' };
      case 'rejected': return { text: 'Reddedildi', icon: AlertCircle, color: 'bg-red-500 text-red-foreground' };
      case 'information': return { text: 'Bilgi', icon: Info, color: 'bg-blue-500 text-blue-foreground' };
      default: return { text: status, icon: Info, color: 'bg-gray-500 text-gray-foreground' };
    }
  };


  if (isLoadingProject) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-1/4" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card><CardHeader><Skeleton className="h-10 w-3/4 mb-2" /><Skeleton className="h-5 w-1/2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-5 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-16 w-full" /></CardContent></Card>
          </div>
          <div className="md:col-span-1 space-y-6">
            <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /><Skeleton className="h-10 w-1/3 mt-2" /></CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Hata</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push('/projects')}>Proje Listesine Dön</Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Proje Bulunamadı</h2>
        <p className="text-muted-foreground mb-4">Aradığınız proje mevcut değil veya silinmiş olabilir.</p>
        <Button onClick={() => router.push('/projects')}>Proje Listesine Dön</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/projects')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Proje Listesine Dön
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Sütun: Proje Detayları ve Görevler */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <CardTitle className="font-headline text-3xl mb-1">{project.projectName}</CardTitle>
                  <CardDescription className="text-base flex items-center">
                    <Hotel className="mr-2 h-4 w-4 text-muted-foreground" /> {project.hotel || 'Belirtilmemiş'}
                  </CardDescription>
                </div>
                {project.status && <Badge className={`text-sm px-3 py-1 ${getStatusColor(project.status)}`}>{project.status}</Badge>}
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
                {project.updatedAt && <p>Son Güncelleme: {formatDateDisplay(project.updatedAt, 'dd.MM.yyyy HH:mm')}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" onClick={() => toast({title: "Düzenleme Modu", description:"Proje düzenleme formu burada açılacak."})}>
                Projeyi Düzenle
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center"><GitBranch className="mr-2 h-5 w-5 text-primary"/>Bağlı Görevler</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : projectTasks.length > 0 ? (
                <ul className="space-y-3">
                  {projectTasks.map(task => (
                    <li key={task.id} className="p-3 border rounded-md hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-base">{task.taskName}</p>
                        <Badge variant={task.status === "Tamamlandı" ? "default" : "secondary"}>{task.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Bitiş Tarihi: {formatDateDisplay(task.dueDate, 'dd MMM yyyy')}</p>
                      {task.assignedTo && <p className="text-xs text-muted-foreground">Atanan: {users.find(u=>u.uid === task.assignedTo)?.firstName || task.assignedTo}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Bu projeye bağlı görev bulunmamaktadır.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ Sütun: İşbirliği Alanı */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg sticky top-20"> 
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary" />Proje Akışı & Yorumlar</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleAddActivitySubmit} ref={activityFormRef} className="space-y-3 mb-6">
                <input type="hidden" name="projectId" value={projectId} />
                {currentUser && (
                  <>
                    <input type="hidden" name="userId" value={currentUser.uid} />
                    <input type="hidden" name="userName" value={getDisplayName()} />
                    <input type="hidden" name="userPhotoURL" value={currentUser.photoURL || ""} />
                  </>
                )}
                <div>
                  <Label htmlFor="activityContent">Yorum veya Güncelleme Ekle</Label>
                  <Textarea id="activityContent" name="content" placeholder="Proje hakkında bir güncelleme yazın..." rows={3} />
                </div>
                <div>
                  <Label htmlFor="activityFile">Dosya Ekle (Opsiyonel)</Label>
                  <Input id="activityFile" name="file" type="file" ref={fileInputRef} />
                  <p className="text-xs text-muted-foreground mt-1">Dosya yükleme işlevi yakında eklenecektir. Şimdilik sadece dosya adı kaydedilir.</p>
                </div>
                <div className="flex justify-end">
                  <SubmitActivityButton />
                </div>
              </form>

              <h4 className="text-md font-semibold mb-2 border-t pt-4">Geçmiş Aktiviteler</h4>
              {isLoadingActivities ? (
                <div className="space-y-3">
                    <div className="flex items-start space-x-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div></div>
                    <div className="flex items-start space-x-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-full" /></div></div>
                </div>
              ) : projectActivities.length > 0 ? (
                <ScrollArea className="h-[400px] pr-3"> 
                  <ul className="space-y-4">
                    {projectActivities.map(activity => {
                      const activityStatusInfo = getActivityStatusInfo(activity.status);
                      const Icon = activityStatusInfo.icon;
                      return (
                        <li key={activity.id} className="flex items-start space-x-3 p-3 border rounded-md bg-card/50">
                           <Avatar className="h-10 w-10 border">
                            <AvatarImage src={activity.userPhotoURL || `https://placehold.co/40x40.png`} alt={activity.userName} data-ai-hint="user avatar" />
                            <AvatarFallback>{activity.userName?.substring(0,1) || 'K'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                               <p className="text-sm font-semibold">{activity.userName}</p>
                               <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.createdAt)}</p>
                            </div>
                            {activity.type === 'comment' && activity.content && <p className="text-sm mt-1 whitespace-pre-line">{activity.content}</p>}
                            {activity.type === 'file_upload' && activity.fileName && (
                              <div className="mt-1 p-2 border rounded-md bg-muted/30">
                                <Paperclip className="inline mr-2 h-4 w-4" />
                                <span className="text-sm font-medium">{activity.fileName}</span>
                                {activity.content && <p className="text-xs text-muted-foreground mt-1">{activity.content}</p>}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                                <Badge variant="outline" className={`text-xs ${activityStatusInfo.color}`}>
                                    <Icon className="mr-1 h-3 w-3" />
                                    {activityStatusInfo.text}
                                </Badge>
                                {activity.status === 'draft' && activity.userId === currentUser?.uid && (
                                    <Dialog open={activityToApprove?.id === activity.id} onOpenChange={(open) => {
                                        if (open) {
                                            setActivityToApprove(activity);
                                        } else {
                                            setActivityToApprove(null);
                                            setApprovalMessage(""); // Reset message on close
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="xs" className="text-xs">
                                                <ThumbsUp className="mr-1 h-3 w-3" /> Onaya Gönder
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>İçeriği Onaya Gönder</DialogTitle>
                                                <DialogDescription>
                                                    Bu güncellemeyi Pazarlama Müdürü'ne onaya göndermek üzeresiniz. İsteğe bağlı bir mesaj ekleyebilirsiniz.
                                                    İçerik: "{activity.content || activity.fileName}"
                                                </DialogDescription>
                                            </DialogHeader>
                                            <Textarea 
                                                placeholder="Pazarlama Müdürü için mesaj (opsiyonel)..."
                                                value={approvalMessage}
                                                onChange={(e) => setApprovalMessage(e.target.value)}
                                                rows={3}
                                            />
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="ghost">İptal</Button>
                                                </DialogClose>
                                                <Button onClick={handleSendForApproval} disabled={isSubmittingApproval}>
                                                    {isSubmittingApproval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Gönder
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                            {activity.status === 'pending_approval' && activity.messageForManager && (
                                <p className="text-xs italic text-muted-foreground mt-1 border-l-2 border-orange-500 pl-2">Yönetici Mesajı: {activity.messageForManager}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Bu proje için henüz bir aktivite (yorum, dosya vb.) bulunmamaktadır.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
