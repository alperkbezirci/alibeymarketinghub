
// src/app/(app)/cms/page.tsx
"use client";

import React, { useState } from 'react';
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Palette, DollarSign, ListPlus, SlidersVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSpendingCategories } from '@/contexts/spending-categories-context';

export default function CmsPage() {
  const { isAdminOrMarketingManager } = useAuth();
  const { toast } = useToast();
  const { categories, addCategory } = useSpendingCategories();
  const [newCategoryNameInput, setNewCategoryNameInput] = useState("");

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
    toast({ title: "Ayarlar Kaydedildi", description: `${settingName} ayarları güncellendi (simülasyon).` });
  };

  const handleAddCategory = () => {
    addCategory(newCategoryNameInput);
    setNewCategoryNameInput(""); // Clear input after adding
  };

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
              <Input id="mainTitle" defaultValue="Ali Bey Marketing Hub" />
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
              <Input id="sorgunBudget" type="number" defaultValue="50000" />
            </div>
             <div>
              <Label htmlFor="manavgatBudget">Ali Bey Club & Park Manavgat Bütçe Limiti (€)</Label>
              <Input id="manavgatBudget" type="number" defaultValue="75000" />
            </div>
             <div>
              <Label htmlFor="bijalBudget">BIJAL Bütçe Limiti (€)</Label>
              <Input id="bijalBudget" type="number" defaultValue="120000" />
            </div>
            <Button onClick={() => handleSaveSettings("Bütçe")}>Bütçe Ayarlarını Kaydet</Button>
          </CardContent>
        </Card>

        {/* Spending Categories */}
        <Card className="shadow-lg md:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><ListPlus className="mr-2 h-5 w-5 text-primary"/> Harcama Kategorileri</CardTitle>
            <CardDescription>Yeni harcama kategorileri oluşturun ve mevcutları yönetin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Mevcut Kategoriler:</Label>
              {categories.length > 0 ? (
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {categories.map(category => (
                    <li key={category.id} className="text-sm flex justify-between items-center">
                      {category.name}
                      {/* Future: Add delete/edit buttons here
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={() => console.log('Delete', category.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      */}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Henüz harcama kategorisi eklenmemiş.</p>
              )}
            </div>
            <div className="flex items-end gap-2 pt-4 border-t">
              <div className="flex-grow">
                <Label htmlFor="newCategoryNameInput">Yeni Kategori Adı</Label>
                <Input 
                  id="newCategoryNameInput" 
                  placeholder="Örn: PR Çalışmaları" 
                  value={newCategoryNameInput}
                  onChange={(e) => setNewCategoryNameInput(e.target.value)}
                />
              </div>
              <Button onClick={handleAddCategory}>Kategori Ekle</Button>
            </div>
            <p className="text-xs text-muted-foreground pt-2">Not: Eklenen kategoriler bu oturum için geçerlidir. Kalıcı depolama için veritabanı entegrasyonu gereklidir.</p>
          </CardContent>
        </Card>
      </div>
       <p className="text-center text-muted-foreground">
        Bu alanda uygulamanın çeşitli iç ayarlarını ve içeriklerini yönetebilirsiniz.
      </p>
    </div>
  );
}
