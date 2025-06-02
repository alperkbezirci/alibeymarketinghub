// src/app/(app)/budget/page.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, TrendingUp, Hotel, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/budget/invoice-form"; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { SPENDING_CATEGORIES, HOTEL_NAMES } from "@/lib/constants";

// Placeholder data
const budgetSummaryData = [
  { name: HOTEL_NAMES[0], totalBudget: 50000, spent: 35000, remaining: 15000 },
  { name: HOTEL_NAMES[1], totalBudget: 75000, spent: 40000, remaining: 35000 },
  { name: HOTEL_NAMES[2], totalBudget: 120000, spent: 90000, remaining: 30000 },
];

const spendingCategoriesData = SPENDING_CATEGORIES.map(category => ({
  name: category,
  limit: Math.floor(Math.random() * 10000) + 5000, // Random limit
  spent: Math.floor(Math.random() * 5000),      // Random spent amount
}));

export default function BudgetPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSaveInvoice = (formData: any) => {
    console.log("Yeni Fatura Kaydedildi:", formData);
    if (formData.file) {
      console.log("Yüklenen Dosya Adı:", formData.file.name);
    }
    // Burada fatura verileriyle bütçe verilerini güncelleme mantığı eklenebilir.
    // Örnek: İlgili otelin harcanan bütçesini artır, ilgili kategorinin harcamasını artır.
    // Şimdilik sadece bir tost mesajı gösteriyoruz.
    let description = `Fatura No: ${formData.invoiceNumber} tutarı ${formData.amount} ${formData.currency} olarak eklendi.`;
    if (formData.file) {
      description += ` Dosya: ${formData.file.name}`;
    }
    toast({ title: "Başarılı", description });
    setIsDialogOpen(false);
  };

  const totalBudget = budgetSummaryData.reduce((sum, item) => sum + item.totalBudget, 0);
  const totalSpent = budgetSummaryData.reduce((sum, item) => sum + item.spent, 0);
  const overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-headline font-bold">Bütçe Yönetimi</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Fatura Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Yeni Fatura</DialogTitle>
            </DialogHeader>
            <InvoiceForm onSave={handleSaveInvoice} onClose={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Budget Summary */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" /> Ana Bütçe Özeti
          </CardTitle>
          <CardDescription>Oteller bazında genel bütçe durumu.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
      
      {/* Spending Categories */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <Layers className="mr-2 h-5 w-5 text-primary" /> Harcama Kategorileri
          </CardTitle>
          <CardDescription>Kategori bazında bütçe limitleri ve harcamalar.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spendingCategoriesData.map(category => (
            <Card key={category.name} className="bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={(category.spent / category.limit) * 100} className="h-2 mb-1" />
                <p className="text-xs text-muted-foreground">
                  {category.spent.toLocaleString('tr-TR')}€ / {category.limit.toLocaleString('tr-TR')}€
                </p>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
