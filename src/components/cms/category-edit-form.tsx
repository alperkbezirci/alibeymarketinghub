
// src/components/cms/category-edit-form.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { SpendingCategory } from '@/contexts/spending-categories-context'; // Import the type

interface CategoryEditFormProps {
  category: SpendingCategory;
  onSave: (id: string, name: string, limit: number) => Promise<void>;
  onClose: () => void;
}

export function CategoryEditForm({ category, onSave, onClose }: CategoryEditFormProps) {
  const [name, setName] = useState(category.name);
  const [limit, setLimit] = useState<number | string>(category.limit);
  const { toast } = useToast();

  useEffect(() => {
    setName(category.name);
    setLimit(category.limit);
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericLimit = parseFloat(String(limit));

    if (!name.trim()) {
      toast({ title: "Hata", description: "Kategori adı boş olamaz.", variant: "destructive" });
      return;
    }
    if (isNaN(numericLimit) || numericLimit < 0) {
      toast({ title: "Hata", description: "Limit geçerli bir sayı olmalı ve 0'dan küçük olmamalıdır.", variant: "destructive" });
      return;
    }
    
    await onSave(category.id, name.trim(), numericLimit);
    // onClose will typically be called by the parent component after onSave promise resolves
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="categoryName">Kategori Adı <span className="text-destructive">*</span></Label>
        <Input
          id="categoryName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="categoryLimit">Limit (€) <span className="text-destructive">*</span></Label>
        <Input
          id="categoryLimit"
          type="number"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          required
          min="0"
          step="0.01"
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
        <Button type="submit">Kaydet</Button>
      </div>
    </form>
  );
}

