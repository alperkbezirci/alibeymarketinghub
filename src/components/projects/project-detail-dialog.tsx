
// src/components/projects/project-detail-dialog.tsx
"use client";

import React, { useEffect, useState, useCallback, useActionState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Info, Hotel, Users, Paperclip, MessageSquare, Send, Edit, CheckCircle, AlertCircle, Clock, ThumbsUp, Loader2, SmilePlus, ThumbsDown, UploadCloud, Download } from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Project } from '@/services/project-service';
import type { User as AuthUser } from '@/contexts/auth-context';
import { getProjectActivities, type ProjectActivity, type ProjectActivityStatus } from '@/services/project-activity-service';
import { handleAddProjectActivityAction, handleUpdateActivityStatusAction, handleApproveActivityAction, handleRejectActivityAction } from '@/app/(app)/projects/[id]/actions';
import { auth } from '@/lib/firebase';
import { useFormStatus } from 'react-dom';

interface ProjectDetailDialogProps {
  project: Project | null;
  users: AuthUser[];
  currentUser: AuthUser | null;
  isAdminOrMarketingManager: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onActivityUpdate?: () => void; // Callback to refresh project list if needed
}

function SubmitActivityButtonDialog() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Gönder
    </Button>
  );
}

export function ProjectDetailDialog({
  project,
  users,
  currentUser,
  isAdminOrMarketingManager,
  isOpen,
  onOpenChange,
  onActivityUpdate,
}: ProjectDetailDialogProps) {
  const { toast } = useToast();
  const [projectActivities, setProjectActivities] = useState<ProjectActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const [addActivityState, handleAddActivitySubmit] = useActionState(handleAddProjectActivityAction, undefined);
  const activityFormRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedActivityFileName, setSelectedActivityFileName] = useState<string | null>(null);
  const [idTokenForActivityForm, setIdTokenForActivityForm] = useState<string>('');

  const [activityToApprove, setActivityToApprove] = useState<ProjectActivity | null>(null);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const [activityForDecision, setActivityForDecision] = useState<ProjectActivity | null>(null);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | null>(null);
  const [managerFeedbackInput, setManagerFeedbackInput] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const fetchActivitiesForProject = useCallback(async () => {
    if (!project?.id) return;
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
      const activities = await getProjectActivities(project.id);
      setProjectActivities(activities);
    } catch (err: any) {
      console.error("Error fetching project activities for dialog:", err);
      setActivitiesError(err.message || "Proje aktiviteleri yüklenirken bir hata oluştu.");
      toast({ title: "Aktivite Yükleme Hatası", description: err.message, variant: "destructive", duration: 7000 });
    } finally {
      setIsLoadingActivities(false);
    }
  }, [project?.id, toast]);

  useEffect(() => {
    if (isOpen && project?.id) {
      fetchActivitiesForProject();
      if (auth.currentUser) {
        auth.currentUser.getIdToken(true).then(token => {
          setIdTokenForActivityForm(token);
        }).catch(err => {
          console.error("Error getting ID token for activity form in dialog:", err);
          toast({ title: "Kimlik Doğrulama Hatası", description: "Form gönderimi için kullanıcı kimliği alınamadı.", variant: "destructive" });
        });
      }
    } else {
      // Reset states when dialog closes or project is not available
      setProjectActivities([]);
      setSelectedActivityFileName(null);
      if (activityFormRef.current) activityFormRef.current.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen, project?.id, fetchActivitiesForProject, toast]);

  useEffect(() => {
    if (addActivityState?.message) {
      if (addActivityState.success) {
        toast({ title: "Başarılı", description: addActivityState.message });
        activityFormRef.current?.reset();
        if(fileInputRef.current) fileInputRef.current.value = "";
        setSelectedActivityFileName(null);
        fetchActivitiesForProject();
        if (onActivityUpdate) onActivityUpdate();
        if (auth.currentUser) {
          auth.currentUser.getIdToken(true).then(token => setIdTokenForActivityForm(token));
        }
      } else {
        toast({ title: "Hata", description: addActivityState.message, variant: "destructive" });
      }
    }
  }, [addActivityState, toast, fetchActivitiesForProject, onActivityUpdate]);

  const handleSendForApproval = async () => {
    if (!activityToApprove || !project?.id) return;
    setIsSubmittingApproval(true);
    const currentIdToken = await auth.currentUser?.getIdToken();
    const result = await handleUpdateActivityStatusAction(activityToApprove.id, project.id, 'pending_approval', approvalMessage, currentIdToken);
    if (result.success) {
        toast({ title: "Başarılı", description: result.message });
        fetchActivitiesForProject();
        if (onActivityUpdate) onActivityUpdate();
        setActivityToApprove(null);
        setApprovalMessage("");
    } else {
        toast({ title: "Hata", description: result.message, variant: "destructive" });
    }
    setIsSubmittingApproval(false);
  };

  const handleManagerDecision = async () => {
    if (!activityForDecision || !decisionType || !project?.id) return;
    setIsSubmittingDecision(true);
    const currentIdToken = await auth.currentUser?.getIdToken();
    let result;
    if (decisionType === 'approve') {
      result = await handleApproveActivityAction(activityForDecision.id, project.id, managerFeedbackInput, currentIdToken);
    } else {
      result = await handleRejectActivityAction(activityForDecision.id, project.id, managerFeedbackInput, currentIdToken);
    }

    if (result.success) {
      toast({ title: "Başarılı", description: result.message });
      fetchActivitiesForProject();
      if (onActivityUpdate) onActivityUpdate();
      setActivityForDecision(null);
      setDecisionType(null);
      setManagerFeedbackInput("");
    } else {
      toast({ title: "Hata", description: result.message, variant: "destructive" });
    }
    setIsSubmittingDecision(false);
  };

  if (!project) return null;

  const formatDateDisplay = (dateInput: string | undefined | null, dateFormat: string = 'dd MMMM yyyy, EEEE') => {
    if (!dateInput) return 'Belirtilmemiş';
    try {
      return format(new Date(dateInput), dateFormat, { locale: tr });
    } catch (e) { return 'Geçersiz Tarih'; }
  };
  
  const formatRelativeTime = (dateInput: string | undefined | null) => {
    if (!dateInput) return '';
    try { return formatDistanceToNow(new Date(dateInput), { addSuffix: true, locale: tr }); } 
    catch (e) { return ''; }
  };

  const getResponsiblePersonNames = () => {
    if (!project.responsiblePersons || project.responsiblePersons.length === 0) return 'Atanmamış';
    return project.responsiblePersons.map(uid => {
      const user = users.find(u => u.uid === uid);
      return user ? `${user.firstName} ${user.lastName}` : `Kullanıcı (ID: ${uid.substring(0,6)}...)`;
    }).join(', ');
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-500';
    switch (status) {
      case 'Tamamlandı': return 'bg-green-500';
      case 'Devam Ediyor': return 'bg-blue-500';
      case 'Planlama': return 'bg-yellow-500 text-black';
      case 'Beklemede': return 'bg-orange-500';
      case 'İptal Edildi': return 'bg-red-500';
      default: return 'bg-gray-500';
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
  
  const getFileNameFromPath = (path?: string) => {
    if (!path) return "Dosyayı İndir";
    const nameWithoutPrefix = path.split('/').pop() || path;
    return nameWithoutPrefix.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '') || "Dosya";
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pr-6"> {/* Add padding for close button */}
          <DialogTitle className="font-headline text-2xl flex justify-between items-start">
            <span className="truncate mr-2">{project.projectName || "Proje Detayı"}</span>
            {project.status && <Badge className={cn("text-sm px-3 py-1 whitespace-nowrap shrink-0", getStatusColor(project.status))}>{project.status}</Badge>}
          </DialogTitle>
          <DialogDescription className="text-base flex items-center pt-1">
            <Hotel className="mr-2 h-4 w-4 text-muted-foreground" /> {project.hotel || 'Otel Belirtilmemiş'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start p-1">
            {/* Project Details Section */}
            <div className="md:col-span-1 space-y-5 text-sm">
              <div>
                <h4 className="font-semibold mb-1 flex items-center text-primary"><CalendarDays className="mr-2 h-5 w-5" />Tarihler</h4>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm pl-7">
                    <p><span className="font-medium text-muted-foreground">Başlangıç:</span> {formatDateDisplay(project.startDate)}</p>
                    <p><span className="font-medium text-muted-foreground">Bitiş:</span> {formatDateDisplay(project.endDate)}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1 flex items-center text-primary"><Users className="mr-2 h-5 w-5" />Sorumlu Kişiler</h4>
                <p className="pl-7">{users.length > 0 ? getResponsiblePersonNames() : <Skeleton className="h-4 w-1/2" />}</p>
              </div>
              {project.description && (
                <div>
                  <h4 className="font-semibold mb-1 flex items-center text-primary"><Info className="mr-2 h-5 w-5" />Açıklama</h4>
                  <p className="pl-7 whitespace-pre-line leading-relaxed">{project.description}</p>
                </div>
              )}
              {project.projectFileURL && (
                <div>
                  <h4 className="font-semibold mb-1 flex items-center text-primary"><Paperclip className="mr-2 h-5 w-5" />Proje Ana Dosyası</h4>
                  <p className="pl-7">
                    <a href={project.projectFileURL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                      <Download className="mr-1 h-4 w-4" /> 
                      {getFileNameFromPath(project.projectStoragePath) || "Dosyayı İndir"}
                    </a>
                  </p>
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-3 border-t mt-4">
                <p>Oluşturulma: {formatDateDisplay(project.createdAt, 'dd.MM.yyyy HH:mm')}</p>
                {project.updatedAt && project.updatedAt !== project.createdAt && (
                  <p>Son Güncelleme: {formatDateDisplay(project.updatedAt, 'dd.MM.yyyy HH:mm')}</p>
                )}
              </div>
            </div>

            {/* Project Activities Section */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-headline text-xl flex items-center mb-2 border-b pb-2"><MessageSquare className="mr-2 h-5 w-5 text-primary" />Proje Akışı & Yorumlar</h3>
              <form action={handleAddActivitySubmit} ref={activityFormRef} className="space-y-3 p-3 border rounded-lg bg-muted/20 mb-4">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="idToken" value={idTokenForActivityForm} />
                <div>
                  <Label htmlFor="activityContentDialog" className="sr-only">Yorumunuz</Label>
                  <Textarea id="activityContentDialog" name="content" placeholder="Proje hakkında bir güncelleme, yorum veya soru yazın..." rows={3} className="bg-background"/>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                    <div className="flex-grow space-y-1">
                        <Label htmlFor="activityFileDialog" className="text-xs font-medium">Dosya Ekle (Opsiyonel)</Label>
                        <Input id="activityFileDialog" name="file" type="file" ref={fileInputRef} className="hidden" onChange={(e) => setSelectedActivityFileName(e.target.files?.[0]?.name || null)}/>
                        <Label htmlFor="activityFileDialog" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer w-full sm:w-auto justify-center flex items-center")}>
                            <UploadCloud className="mr-2 h-4 w-4" />Dosya Seç
                        </Label>
                        {selectedActivityFileName ? <p className="text-xs text-muted-foreground mt-1">Seçilen: {selectedActivityFileName}</p> : <p className="text-xs text-muted-foreground mt-1">Dosya seçilmedi.</p>}
                    </div>
                    <SubmitActivityButtonDialog />
                </div>
              </form>

              <h4 className="text-md font-semibold mt-4 mb-2">Geçmiş Aktiviteler</h4>
              {isLoadingActivities ? (
                <div className="space-y-3"> {[1,2].map(i => <Skeleton key={i} className="h-20 w-full rounded-md" />)} </div>
              ) : activitiesError ? (
                <p className="text-destructive text-center py-4">{activitiesError}</p>
              ) : projectActivities.length > 0 ? (
                  <ul className="space-y-3">
                    {projectActivities.map(activity => {
                      const activityStatusInfo = getActivityStatusInfo(activity.status);
                      const ActivityIcon = activityStatusInfo.icon;
                      const isCurrentUserAuthor = activity.userId === currentUser?.uid;
                      return (
                        <li key={activity.id} className="flex space-x-3 p-3 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
                          <Avatar className="h-10 w-10 border mt-0.5"><AvatarImage src={activity.userPhotoURL || `https://placehold.co/40x40.png`} alt={activity.userName} data-ai-hint="user avatar" /><AvatarFallback>{activity.userName?.substring(0,1).toUpperCase()||'K'}</AvatarFallback></Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-sm font-semibold text-card-foreground">{activity.userName}</p>
                              <p className="text-xs text-muted-foreground" title={formatDateDisplay(activity.createdAt, 'dd MMMM yyyy, HH:mm:ss')}>{formatRelativeTime(activity.createdAt)}</p>
                            </div>
                            {activity.type === 'comment' && activity.content && <p className="text-sm text-foreground/90 mt-1 whitespace-pre-line leading-relaxed">{activity.content}</p>}
                            {activity.type === 'file_upload' && activity.fileURL && (
                              <div className="mt-1.5 p-2.5 border rounded-md bg-muted/40 hover:bg-muted/60">
                                <div className="flex items-center text-sm"><Paperclip className="mr-2 h-4 w-4 text-muted-foreground" /><a href={activity.fileURL} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{getFileNameFromPath(activity.storagePath) || activity.fileName || "Dosyayı Görüntüle"}</a></div>
                                {activity.fileType && <p className="text-xs text-muted-foreground ml-6">{activity.fileType}</p>}
                                {activity.content && <p className="text-xs text-muted-foreground mt-1 ml-6 pt-1 border-t border-dashed">{activity.content}</p>}
                              </div>
                            )}
                            <div className={cn("flex items-center justify-between mt-2.5 pt-2 border-t border-dashed", activity.status === 'pending_approval' && isAdminOrMarketingManager ? "flex-wrap gap-y-2" : "")}>
                              <Badge variant="outline" className={cn("text-xs font-medium py-0.5 px-2", activityStatusInfo.color)}><ActivityIcon className={cn("mr-1.5 h-3.5 w-3.5", activityStatusInfo.iconColor)} />{activityStatusInfo.text}</Badge>
                              {activity.status === 'draft' && isCurrentUserAuthor && (
                                <Dialog open={activityToApprove?.id === activity.id} onOpenChange={(open) => { if(open) { setActivityToApprove(activity); setApprovalMessage(activity.messageForManager || ""); } else { setActivityToApprove(null); setApprovalMessage(""); }}}>
                                  <DialogTrigger asChild><Button variant="outline" size="xs" className="text-xs h-7 px-2 py-1 text-primary hover:bg-primary/5 border-primary/50"><ThumbsUp className="mr-1 h-3.5 w-3.5" /> Onaya Gönder</Button></DialogTrigger>
                                  <DialogContent><DialogHeader><DialogTitle className="font-headline text-xl">İçeriği Onaya Gönder</DialogTitle><DialogDescription>Aşağıdaki güncellemeyi onaya göndermek üzeresiniz.<blockquote className="mt-2 p-2 border-l-4 bg-muted text-sm italic">{activity.content ? `"${activity.content.substring(0,100)}${activity.content.length > 100 ? "..." : ""}"` : `Dosya: "${activity.fileName}"`}</blockquote></DialogDescription></DialogHeader><div className="py-2"><Label htmlFor="approvalMessageDlg" className="text-sm font-medium">Yönetici için Mesaj (Opsiyonel)</Label><Textarea id="approvalMessageDlg" placeholder="Onaylayan kişiye not..." value={approvalMessage} onChange={(e) => setApprovalMessage(e.target.value)} rows={3} className="mt-1"/></div><DialogFooter><DialogClose asChild><Button variant="ghost" disabled={isSubmittingApproval}>İptal</Button></DialogClose><Button onClick={handleSendForApproval} disabled={isSubmittingApproval}>{isSubmittingApproval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gönder</Button></DialogFooter></DialogContent>
                                </Dialog>
                              )}
                              {activity.status === 'pending_approval' && isAdminOrMarketingManager && (
                                <div className="flex space-x-2 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                                  <Button variant="outline" size="xs" className="text-xs h-7 px-2 py-1 text-red-600 hover:bg-red-500/10 border-red-500/50" onClick={() => { setActivityForDecision(activity); setDecisionType('reject'); setManagerFeedbackInput(activity.managerFeedback || ""); }}><ThumbsDown className="mr-1 h-3.5 w-3.5" /> Reddet</Button>
                                  <Button variant="outline" size="xs" className="text-xs h-7 px-2 py-1 text-green-600 hover:bg-green-500/10 border-green-500/50" onClick={() => { setActivityForDecision(activity); setDecisionType('approve'); setManagerFeedbackInput(activity.managerFeedback || ""); }}><ThumbsUp className="mr-1 h-3.5 w-3.5" /> Onayla</Button>
                                </div>
                              )}
                            </div>
                            {activity.status === 'pending_approval' && activity.messageForManager && <p className="text-xs italic text-muted-foreground mt-1.5 border-l-2 border-orange-400 pl-2 py-1 bg-orange-50 dark:bg-orange-900/30 rounded-r-md"><span className="font-semibold not-italic">Kullanıcı Notu:</span> {activity.messageForManager}</p>}
                            {activity.status === 'rejected' && activity.managerFeedback && <p className="text-xs italic text-muted-foreground mt-1.5 border-l-2 border-red-400 pl-2 py-1 bg-red-50 dark:bg-red-900/30 rounded-r-md"><span className="font-semibold not-italic">Yönetici Geri Bildirimi:</span> {activity.managerFeedback}</p>}
                            {activity.status === 'approved' && activity.managerFeedback && <p className="text-xs italic text-muted-foreground mt-1.5 border-l-2 border-green-400 pl-2 py-1 bg-green-50 dark:bg-green-900/30 rounded-r-md"><span className="font-semibold not-italic">Yönetici Geri Bildirimi:</span> {activity.managerFeedback}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
              ) : (
                <div className="text-center py-6"><SmilePlus className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" /><p className="text-sm text-muted-foreground">Bu proje için henüz bir aktivite bulunmamaktadır.</p></div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="sm:justify-end mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>

      {/* Sub-dialog for manager's decision */}
      <Dialog open={!!activityForDecision && !!decisionType} onOpenChange={(open) => { if (!open) { setActivityForDecision(null); setDecisionType(null); setManagerFeedbackInput(""); }}}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-headline text-xl">Aktiviteyi {decisionType === 'approve' ? 'Onayla' : 'Reddet'}</DialogTitle>
            <DialogDescription>Aşağıdaki aktivite için kararınızı ve geri bildiriminizi girin.
              <blockquote className="mt-2 p-2 border-l-4 bg-muted text-sm italic">
                Kullanıcı: {activityForDecision?.userName} <br />
                İçerik: {activityForDecision?.content ? `"${activityForDecision.content.substring(0,100)}${activityForDecision.content.length > 100 ? "..." : ""}"` : `Dosya: "${activityForDecision?.fileName}"`}
                {activityForDecision?.messageForManager && <><br/>Kullanıcı Notu: {activityForDecision.messageForManager}</>}
              </blockquote>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2"><Label htmlFor="managerFeedbackDlg" className="text-sm font-medium">Geri Bildirim (Opsiyonel)</Label><Textarea id="managerFeedbackDlg" placeholder="Onay veya red için not..." value={managerFeedbackInput} onChange={(e) => setManagerFeedbackInput(e.target.value)} rows={3} className="mt-1"/></div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setActivityForDecision(null); setDecisionType(null); setManagerFeedbackInput("");}} disabled={isSubmittingDecision}>İptal</Button>
            <Button onClick={handleManagerDecision} disabled={isSubmittingDecision} className={cn(decisionType === 'approve' ? "bg-green-600 hover:bg-green-700" : "bg-destructive hover:bg-destructive/90")}>
              {isSubmittingDecision && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {decisionType === 'approve' ? 'Onayla' : 'Reddet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

    
