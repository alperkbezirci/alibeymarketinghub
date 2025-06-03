// src/app/(app)/cms/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Settings, Palette, DollarSign, ListPlus, SlidersVertical, Edit2, Trash2, Loader2, UploadCloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSpendingCategories, type SpendingCategory } from '@/contexts/spending-categories-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CategoryEditForm } from "@/components/cms/category-edit-form";
import { Skeleton } from '@/components/ui/skeleton';
import { getHotelBudgetLimitsForCms, saveHotelBudgetLimitsCms, type BudgetConfigData } from '@/services/budget-config-service';
import { getUiSettings, saveUiSettings, type UiSettings } from '@/services/ui-config-service'; // Import UI config service
import { cn } from '@/lib/utils';


export default function CmsPage() {
  const { isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();
  const { categories, addCategory, updateCategory, isLoading: isLoadingCategories, error: categoriesError, refetchCategories } = useSpendingCategories();
  
  const [newCategoryNameInput, setNewCategoryNameInput] = useState("");
  const [newCategoryLimitInput, setNewCategoryLimitInput] = useState<number | string>("");
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SpendingCategory | null>(null);

  const [budgetLimits, setBudgetLimits] = useState<BudgetConfigData>({
    aliBeyResortSorgunBudget: 0,
    aliBeyClubManavgatBudget: 0,
    bijalBudget: 0,
  });
  const [isLoadingBudgetLimits, setIsLoadingBudgetLimits] = useState(true);
  const [isSavingBudgetLimits, setIsSavingBudgetLimits] = useState(false);

  // UI Settings State
  const [uiSettings, setUiSettings] = useState<UiSettings>({ mainTitle: '', logoUrl: '' });
  const [isLoadingUiSettings, setIsLoadingUiSettings] = useState(true);
  const [isSavingUiSettings, setIsSavingUiSettings] = useState(false);
  const [selectedLogoFileName, setSelectedLogoFileName] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);


  const fetchBudgetLimits = useCallback(async () => {
    setIsLoadingBudgetLimits(true);
    try {
      const limits = await getHotelBudgetLimitsForCms();
      setBudgetLimits(limits);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Bütçe limitleri yüklenemedi.", variant: "destructive" });
    } finally {
      setIsLoadingBudgetLimits(false);
    }
  }, [toast]);

  const fetchUiSettings = useCallback(async () => {
    setIsLoadingUiSettings(true);
    try {
      const settings = await getUiSettings();
      setUiSettings(settings);
      if (settings.logoUrl && !settings.logoUrl.startsWith('https://placehold.co')) {
        // Potentially extract filename from URL if it's a real uploaded file in future
      }
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Arayüz ayarları yüklenemedi.", variant: "destructive" });
    } finally {
      setIsLoadingUiSettings(false);
    }
  }, [toast]);


  useEffect(() => {
    if (isAdminOrMarketingManager) {
      fetchBudgetLimits();
      fetchUiSettings();
    }
  }, [isAdminOrMarketingManager, fetchBudgetLimits, fetchUiSettings]);

  const handleBudgetLimitChange = (hotelKey: keyof BudgetConfigData, value: string) => {
    const numericValue = parseFloat(value);
    setBudgetLimits(prev => ({
      ...prev,
      [hotelKey]: isNaN(numericValue) ? "" : numericValue 
    }));
  };

  const handleSaveBudgetLimits = async () => {
    setIsSavingBudgetLimits(true);
    try {
      const limitsToSave: BudgetConfigData = {
        aliBeyResortSorgunBudget: Number(budgetLimits.aliBeyResortSorgunBudget) || 0,
        aliBeyClubManavgatBudget: Number(budgetLimits.aliBeyClubManavgatBudget) || 0,
        bijalBudget: Number(budgetLimits.bijalBudget) || 0,
      };
      await saveHotelBudgetLimitsCms(limitsToSave);
      toast({ title: "Başarılı", description: "Otel bütçe limitleri kaydedildi." });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Bütçe limitleri kaydedilemedi.", variant: "destructive" });
    } finally {
      setIsSavingBudgetLimits(false);
    }
  };

  const handleUiSettingChange = (field: keyof UiSettings, value: string) => {
    setUiSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveUISettings = async () => {
    setIsSavingUiSettings(true);
    try {
      // For now, if a new file is selected, we're not uploading it, just clearing selection.
      // Real file upload would be more complex.
      // If a file was selected via selectedLogoFileName, we could *try* to use it,
      // but for now, saveUiSettings expects a URL.
      const settingsToSave: UiSettings = {
        mainTitle: uiSettings.mainTitle,
        // If selectedLogoFileName is set, it means user tried to pick a new file.
        // We'd need to upload it first and get a URL.
        // For this iteration, we'll just keep existing logoUrl or a placeholder if new file was picked but not uploaded.
        logoUrl: uiSettings.logoUrl || 'https://placehold.co/150x50.png?text=LOGO' 
      };
      await saveUiSettings(settingsToSave);
      toast({ title: "Başarılı", description: "Arayüz ayarları kaydedildi." });
      // Optionally re-fetch settings or update local state if saveUiSettings doesn't return the full object
      // fetchUiSettings(); 
      setSelectedLogoFileName(null); // Clear file name after save attempt
      if (logoFileInputRef.current) logoFileInputRef.current.value = ""; // Reset file input
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "Arayüz ayarları kaydedilemedi.", variant: "destructive" });
    } finally {
      setIsSavingUiSettings(false);
    }
  };


  if (!isAdminOrMarketingManager) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <SlidersVertical className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Erişim Reddedildi</h1>
        <p className="text-muted-foreground">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }

  const handleAddCategory = async () => {
    const numericLimit = parseFloat(String(newCategoryLimitInput));
    if (!newCategoryNameInput.trim()) {
        toast({ title: "Hata", description: "Kategori adı boş olamaz.", variant: "destructive" });
        return;
    }
    if (isNaN(numericLimit) || numericLimit < 0) {
        toast({ title: "Hata", description: "Limit geçerli bir sayı olmalı ve 0'dan küçük olmamalıdır.", variant: "destructive" });
        return;
    }
    await addCategory(newCategoryNameInput, numericLimit);
    setNewCategoryNameInput(""); 
    setNewCategoryLimitInput("");
  };

  const handleEditCategory = (category: SpendingCategory) => {
    setSelectedCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedCategory = async (id: string, name: string, limit: number) => {
    await updateCategory(id, name, limit);
    setIsEditDialogOpen(false);
    setSelectedCategory(null);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold">İçerik Yönetim Sistemi (CMS)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* UI Customization Placeholder */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><Palette className="mr-2 h-5 w-5 text-primary"/> Arayüz Özelleştirme</CardTitle>
            <CardDescription>Başlıklar, logolar ve genel görünüm ayarları. Veriler Firestore'da saklanır.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingUiSettings ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-1/3" />
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="mainTitle">Ana Başlık</Label>
                  <Input 
                    id="mainTitle" 
                    placeholder="Örn: Ali Bey Marketing Hub" 
                    value={uiSettings.mainTitle}
                    onChange={(e) => handleUiSettingChange('mainTitle', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="logoUpload">Logo Yükle (PNG, JPG)</Label>
                  <div className="flex flex-col gap-2 mt-1">
                    <Input 
                        id="logoUpload" 
                        name="logoFile"
                        type="file" 
                        className="hidden"
                        accept="image/png, image/jpeg"
                        onChange={(e) => {
                            setSelectedLogoFileName(e.target.files?.[0]?.name || null);
                            // If you want to preview image, you'd handle e.target.files[0] here
                            // For now, just updating the name. Actual upload needs more logic.
                        }}
                        ref={logoFileInputRef}
                    />
                    <Label
                        htmlFor="logoUpload"
                        className={cn(
                            buttonVariants({ variant: "outline" }),
                            "cursor-pointer w-full sm:w-auto justify-center flex items-center"
                        )}
                    >
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Logo Seç
                    </Label>
                    {selectedLogoFileName ? (
                        <p className="text-sm text-muted-foreground">Seçilen: {selectedLogoFileName}</p>
                    ) : uiSettings.logoUrl ? (
                         <p className="text-sm text-muted-foreground">Mevcut Logo: <a href={uiSettings.logoUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-xs inline-block">{uiSettings.logoUrl.split('/').pop()}</a></p>
                    ) : (
                        <p className="text-sm text-muted-foreground">Logo seçilmedi.</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Gerçek logo yükleme ve saklama henüz tam olarak aktif değildir. Şimdilik URL güncellenecektir.</p>
                </div>
                <Button onClick={handleSaveUISettings} disabled={isSavingUiSettings}>
                  {isSavingUiSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Arayüz Ayarlarını Kaydet
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Budget Management */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/> Ana Bütçe Limitleri</CardTitle>
            <CardDescription>Otel bazlı ana bütçe limitlerini (EUR) güncelleyin. Veriler Firestore'da saklanır.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingBudgetLimits ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-1/3" />
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="sorgunBudget">Ali Bey Resort Sorgun Bütçe Limiti (€)</Label>
                  <Input 
                    id="sorgunBudget" 
                    type="number" 
                    placeholder="Örn: 50000" 
                    value={budgetLimits.aliBeyResortSorgunBudget}
                    onChange={(e) => handleBudgetLimitChange('aliBeyResortSorgunBudget', e.target.value)} 
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="manavgatBudget">Ali Bey Club & Park Manavgat Bütçe Limiti (€)</Label>
                  <Input 
                    id="manavgatBudget" 
                    type="number" 
                    placeholder="Örn: 75000" 
                    value={budgetLimits.aliBeyClubManavgatBudget}
                    onChange={(e) => handleBudgetLimitChange('aliBeyClubManavgatBudget', e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="bijalBudget">BIJAL Bütçe Limiti (€)</Label>
                  <Input 
                    id="bijalBudget" 
                    type="number" 
                    placeholder="Örn: 120000" 
                    value={budgetLimits.bijalBudget}
                    onChange={(e) => handleBudgetLimitChange('bijalBudget', e.target.value)}
                    min="0"
                  />
                </div>
                <Button onClick={handleSaveBudgetLimits} disabled={isSavingBudgetLimits}>
                  {isSavingBudgetLimits && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Bütçe Limitlerini Kaydet
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Spending Categories */}
        <Card className="shadow-lg md:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><ListPlus className="mr-2 h-5 w-5 text-primary"/> Harcama Kategorileri</CardTitle>
            <CardDescription>Yeni harcama kategorileri oluşturun ve mevcutları yönetin. Veriler Firestore'da saklanır.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Mevcut Kategoriler:</Label>
              {isLoadingCategories ? (
                <div className="space-y-2 mt-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-5/6" />
                </div>
              ) : categoriesError ? (
                 <p className="text-sm text-destructive mt-2">{categoriesError} <Button variant="link" size="sm" onClick={refetchCategories}>Tekrar Dene</Button></p>
              ) : categories.length > 0 ? (
                <ul className="list-none mt-2 space-y-1">
                  {categories.map(category => (
                    <li key={category.id} className="text-sm flex justify-between items-center p-2 border-b last:border-b-0 hover:bg-muted/30 rounded">
                      <div>
                        <span className="font-medium">{category.name}</span>
                        <span className="text-xs text-muted-foreground ml-2"> (Limit: {category.limit.toLocaleString('tr-TR')}€)</span>
                      </div>
                      <div className="space-x-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-500" onClick={() => handleEditCategory(category)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {/* 
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => handleDeleteCategory(category.id, category.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        */}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Henüz harcama kategorisi eklenmemiş.</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-end gap-2 pt-4 border-t">
              <div className="flex-grow">
                <Label htmlFor="newCategoryNameInput">Yeni Kategori Adı</Label>
                <Input 
                  id="newCategoryNameInput" 
                  placeholder="Örn: PR Çalışmaları" 
                  value={newCategoryNameInput}
                  onChange={(e) => setNewCategoryNameInput(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-auto">
                <Label htmlFor="newCategoryLimitInput">Limit (€)</Label>
                <Input 
                  id="newCategoryLimitInput" 
                  type="number"
                  placeholder="Örn: 5000" 
                  value={newCategoryLimitInput}
                  onChange={(e) => setNewCategoryLimitInput(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <Button onClick={handleAddCategory} disabled={isLoadingCategories}>
                {isLoadingCategories && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kategori Ekle
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
       <p className="text-center text-muted-foreground">
        Bu alanda uygulamanın çeşitli iç ayarlarını ve içeriklerini yönetebilirsiniz.
      </p>

      {selectedCategory && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setSelectedCategory(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Kategoriyi Düzenle</DialogTitle>
              <DialogDescription>
                "{selectedCategory.name}" kategorisinin adını veya limitini güncelleyin.
              </DialogDescription>
            </DialogHeader>
            <CategoryEditForm
              category={selectedCategory}
              onSave={handleSaveEditedCategory}
              onClose={() => {
                setIsEditDialogOpen(false);
                setSelectedCategory(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
