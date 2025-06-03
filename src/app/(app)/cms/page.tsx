
// src/app/(app)/cms/page.tsx
"use client";

import React, { useState } from 'react';
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Palette, DollarSign, ListPlus, SlidersVertical, Edit2, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSpendingCategories, type SpendingCategory } from '@/contexts/spending-categories-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { CategoryEditForm } from "@/components/cms/category-edit-form";
import { Skeleton } from '@/components/ui/skeleton';

export default function CmsPage() {
  const { isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();
  const { categories, addCategory, updateCategory, isLoading: isLoadingCategories, error: categoriesError, refetchCategories } = useSpendingCategories();
  
  const [newCategoryNameInput, setNewCategoryNameInput] = useState("");
  const [newCategoryLimitInput, setNewCategoryLimitInput] = useState<number | string>("");
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SpendingCategory | null>(null);

  if (!isAdminOrMarketingManager) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <SlidersVertical className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Erişim Reddedildi</h1>
        <p className="text-muted-foreground">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }

  const handleSaveSettings = (settingName: string) => {
    // TODO: In a real app, this would save to Firestore (e.g., a 'settings' collection or specific documents)
    toast({ title: "Ayarlar Kaydedildi", description: `${settingName} ayarları güncellendi (simülasyon). Firebase'e kaydedilecek.` });
  };

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
  
  // Placeholder for delete - uncomment and implement when service/context supports it
  // const handleDeleteCategory = async (id: string, name: string) => {
  //   if (window.confirm(`"${name}" kategorisini silmek istediğinizden emin misiniz?`)) {
  //     // await deleteCategory(id); // Assuming deleteCategory exists in context
  //     toast({ title: "Başarılı", description: `"${name}" kategorisi silindi (simülasyon).` });
  //   }
  // };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold">İçerik Yönetim Sistemi (CMS)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* UI Customization Placeholder */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><Palette className="mr-2 h-5 w-5 text-primary"/> Arayüz Özelleştirme</CardTitle>
            <CardDescription>Başlıklar, logolar ve genel görünüm ayarları.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mainTitle">Ana Başlık</Label>
              <Input id="mainTitle" placeholder="Örn: Ali Bey Marketing Hub" />
            </div>
            <div>
              <Label htmlFor="logoUpload">Logo Yükle (PNG, JPG)</Label>
              <Input id="logoUpload" type="file" />
            </div>
            <Button onClick={() => handleSaveSettings("Arayüz")}>Arayüz Ayarlarını Kaydet</Button>
          </CardContent>
        </Card>

        {/* Budget Management Placeholder */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/> Bütçe Yönetimi</CardTitle>
            <CardDescription>Ana bütçe limitleri ve otel bazlı atamalar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sorgunBudget">Ali Bey Resort Sorgun Bütçe Limiti (€)</Label>
              <Input id="sorgunBudget" type="number" placeholder="Örn: 50000" />
            </div>
             <div>
              <Label htmlFor="manavgatBudget">Ali Bey Club & Park Manavgat Bütçe Limiti (€)</Label>
              <Input id="manavgatBudget" type="number" placeholder="Örn: 75000" />
            </div>
             <div>
              <Label htmlFor="bijalBudget">BIJAL Bütçe Limiti (€)</Label>
              <Input id="bijalBudget" type="number" placeholder="Örn: 120000" />
            </div>
            <Button onClick={() => handleSaveSettings("Bütçe")}>Bütçe Ayarlarını Kaydet</Button>
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

    
