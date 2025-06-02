
// src/components/user-management/edit-user-form.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { USER_ROLES } from "@/lib/constants";
import { handleUpdateUserAction } from '@/app/(app)/user-management/actions';
import type { User } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditUserFormProps {
  user: User;
  onSuccess: () => void; // Callback to close dialog and refresh list
  onClose: () => void;
}

const initialState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Değişiklikleri Kaydet
    </Button>
  );
}

export function EditUserForm({ user, onSuccess, onClose }: EditUserFormProps) {
  const [state, formAction] = useFormState(handleUpdateUserAction, initialState);
  const { toast } = useToast();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles || []);

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

  const handleRoleChange = (roleValue: string, checked: boolean) => {
    setSelectedRoles(prev => 
      checked ? [...prev, roleValue] : prev.filter(r => r !== roleValue)
    );
  };
  
  return (
    <form action={formAction} className="space-y-4 py-4">
      <input type="hidden" name="uid" value={user.uid} />
      <div>
        <Label htmlFor="name">Ad Soyad *</Label>
        <Input id="name" name="name" defaultValue={user.name} required />
      </div>
      <div>
        <Label htmlFor="email">E-posta Adresi (Değiştirilemez)</Label>
        <Input id="email" name="email" type="email" value={user.email || ""} readOnly disabled />
      </div>
      <div>
        <Label>Roller *</Label>
        <div className="space-y-2 mt-1">
          {Object.entries(USER_ROLES).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox 
                id={`edit-role-${key}`} 
                name="roles" 
                value={value}
                checked={selectedRoles.includes(value)}
                onCheckedChange={(checked) => handleRoleChange(value, Boolean(checked))}
              />
              <Label htmlFor={`edit-role-${key}`} className="font-normal">{value}</Label>
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
