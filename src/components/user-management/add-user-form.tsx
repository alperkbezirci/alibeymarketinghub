
// src/components/user-management/add-user-form.tsx
"use client";

import React, { useEffect } from 'react';
// import { useFormState, useFormStatus } from 'react-dom'; // Eski import
import { useActionState, useFormStatus } from 'react'; // Yeni import React 19+ için
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { USER_ROLES, HOTEL_NAMES, AUTHORIZATION_LEVELS } from "@/lib/constants";
import { handleAddUserAction } from '@/app/(app)/user-management/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddUserFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

const initialState = {
  success: false,
  message: "",
  uid: undefined,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Kullanıcı Oluştur
    </Button>
  );
}

export function AddUserForm({ onSuccess, onClose }: AddUserFormProps) {
  const [state, formAction] = useActionState(handleAddUserAction, initialState); // useFormState -> useActionState
  const { toast } = useToast();

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast({ title: "Başarılı", description: state.message });
        onSuccess(); 
      } else {
        toast({ title: "Hata", description: state.message, variant: "destructive" });
      }
    }
  }, [state, toast, onSuccess]);

  return (
    <form action={formAction} className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">İsim *</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div>
          <Label htmlFor="lastName">Soyisim *</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div>
        <Label htmlFor="email">E-posta Adresi *</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="password">Şifre *</Label>
        <Input id="password" name="password" type="password" required minLength={6} />
        <p className="text-xs text-muted-foreground mt-1">Şifre en az 6 karakter olmalıdır.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Ünvan</Label>
          <Input id="title" name="title" placeholder="Örn: Pazarlama Uzmanı" />
        </div>
        <div>
          <Label htmlFor="organization">Kurum</Label>
          <Select name="organization">
            <SelectTrigger id="organization"><SelectValue placeholder="Kurum seçin" /></SelectTrigger>
            <SelectContent>
              {HOTEL_NAMES.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="authorizationLevel">Yetki Seviyesi *</Label>
        <Select name="authorizationLevel" required>
            <SelectTrigger id="authorizationLevel"><SelectValue placeholder="Yetki seviyesi seçin" /></SelectTrigger>
            <SelectContent>
            {AUTHORIZATION_LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Roller *</Label>
        <div className="space-y-2 mt-1">
          {Object.entries(USER_ROLES).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox id={`role-${key}`} name="roles" value={value} />
              <Label htmlFor={`role-${key}`} className="font-normal">{value}</Label>
            </div>
          ))}
        </div>
         <p className="text-xs text-muted-foreground mt-1">En az bir rol seçilmelidir.</p>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
        <SubmitButton />
      </div>
    </form>
  );
}
