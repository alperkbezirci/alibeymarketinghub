
// src/components/user-management/add-user-form.tsx
"use client";

import React, { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { USER_ROLES } from "@/lib/constants";
import { handleAddUserAction } from '@/app/(app)/user-management/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddUserFormProps {
  onSuccess: () => void; // Callback to close dialog and refresh list
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
  const [state, formAction] = useFormState(handleAddUserAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast({ title: "Başarılı", description: state.message });
        onSuccess(); // Close dialog and refresh
      } else {
        toast({ title: "Hata", description: state.message, variant: "destructive" });
      }
    }
  }, [state, toast, onSuccess]);

  return (
    <form action={formAction} className="space-y-4 py-4">
      <div>
        <Label htmlFor="name">Ad Soyad *</Label>
        <Input id="name" name="name" required />
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
      </div>
      {/* {state?.message && !state.success && (
        <p className="text-sm text-destructive">{state.message}</p>
      )} */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
        <SubmitButton />
      </div>
    </form>
  );
}
