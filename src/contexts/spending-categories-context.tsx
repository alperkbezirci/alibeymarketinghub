
"use client";

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { SPENDING_CATEGORIES as INITIAL_SPENDING_CATEGORIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface SpendingCategory {
  id: string;
  name: string;
}

interface SpendingCategoriesContextType {
  categories: SpendingCategory[];
  addCategory: (name: string) => void;
}

const SpendingCategoriesContext = createContext<SpendingCategoriesContextType | undefined>(undefined);

export function SpendingCategoriesProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<SpendingCategory[]>(
    INITIAL_SPENDING_CATEGORIES.map(name => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name }))
  );

  const addCategory = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: "Hata", description: "Kategori adı boş olamaz.", variant: "destructive" });
      return;
    }
    if (categories.some(category => category.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Hata", description: "Bu kategori zaten mevcut.", variant: "destructive" });
      return;
    }
    const newCategory: SpendingCategory = {
      id: trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), // Ensure unique ID
      name: trimmedName,
    };
    setCategories(prevCategories => [...prevCategories, newCategory]);
    toast({ title: "Başarılı", description: `"${trimmedName}" kategorisi eklendi.` });
  }, [categories, toast]);

  return (
    <SpendingCategoriesContext.Provider value={{ categories, addCategory }}>
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
