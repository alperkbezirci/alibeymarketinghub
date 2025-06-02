
"use client";

import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getSpendingCategories as fetchCategoriesFromDb, 
  addSpendingCategory as addCategoryToDb,
  updateSpendingCategory as updateCategoryInDb,
  // deleteSpendingCategory as deleteCategoryFromDb, // For future use
  type SpendingCategory
} from '@/services/spending-categories-service';

export type { SpendingCategory }; // Export type for use in other components

interface SpendingCategoriesContextType {
  categories: SpendingCategory[];
  addCategory: (name: string, limit: number) => Promise<void>;
  updateCategory: (id: string, name: string, limit: number) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refetchCategories: () => Promise<void>;
}

const SpendingCategoriesContext = createContext<SpendingCategoriesContextType | undefined>(undefined);

export function SpendingCategoriesProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dbCategories = await fetchCategoriesFromDb();
      setCategories(dbCategories);
    } catch (err: any) {
      setError(err.message || "Kategoriler yüklenirken bir hata oluştu.");
      toast({ title: "Hata", description: err.message || "Kategoriler yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const addCategory = useCallback(async (name: string, limit: number) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: "Hata", description: "Kategori adı boş olamaz.", variant: "destructive" });
      return;
    }
     if (limit === undefined || isNaN(limit) || limit < 0) {
      toast({ title: "Hata", description: "Geçerli bir limit girin (0 veya daha büyük).", variant: "destructive" });
      return;
    }
    if (categories.some(category => category.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Hata", description: "Bu kategori adı zaten mevcut.", variant: "destructive" });
      return;
    }
    try {
      const newCategory = await addCategoryToDb(trimmedName, limit);
      setCategories(prevCategories => [...prevCategories, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: "Başarılı", description: `"${trimmedName}" kategorisi eklendi.` });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Kategori eklenirken bir hata oluştu.", variant: "destructive" });
    }
  }, [categories, toast]);

  const updateCategory = useCallback(async (id: string, name: string, limit: number) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: "Hata", description: "Kategori adı boş olamaz.", variant: "destructive" });
      return;
    }
    if (limit === undefined || isNaN(limit) || limit < 0) {
      toast({ title: "Hata", description: "Geçerli bir limit girin (0 veya daha büyük).", variant: "destructive" });
      return;
    }
    // Check if new name already exists for a different category
    if (categories.some(category => category.id !== id && category.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Hata", description: "Bu kategori adı başka bir kategori için zaten kullanılıyor.", variant: "destructive" });
      return;
    }
    try {
      await updateCategoryInDb(id, trimmedName, limit);
      setCategories(prevCategories =>
        prevCategories.map(cat => (cat.id === id ? { ...cat, name: trimmedName, limit } : cat)).sort((a, b) => a.name.localeCompare(b.name))
      );
      toast({ title: "Başarılı", description: `"${trimmedName}" kategorisi güncellendi.` });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Kategori güncellenirken bir hata oluştu.", variant: "destructive" });
    }
  }, [categories, toast]);

  return (
    <SpendingCategoriesContext.Provider value={{ categories, addCategory, updateCategory, isLoading, error, refetchCategories: loadCategories }}>
      {children}
    </SpendingCategoriesContext.Provider>
  );
}

export const useSpendingCategories = (): SpendingCategoriesContextType => {
  const context = useContext(SpendingCategoriesContext);
  if (context === undefined) {
    throw new Error('useSpendingCategories must be used within a SpendingCategoriesProvider');
  }
  return context;
};
