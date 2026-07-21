"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAdminCredentials } from "./actions";
import { toast } from "sonner";

export function ProfileForm({
  admin,
}: {
  admin: { id: number; phone: string; password: string };
}) {
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState(admin.phone);
  const [password, setPassword] = useState(admin.password);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateAdminCredentials({
        id: admin.id,
        phone,
        password,
      });

      if (result.success) {
        toast.success("Profil ma'lumotlari muvaffaqiyatli saqlandi!");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="phone">Telefon raqam</Label>
          <Input
            id="phone"
            type="text"
            placeholder="998901234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Parol (Faqat raqamlar, max 8 ta)</Label>
          <Input
            id="password"
            type="password"
            placeholder="12345678"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </form>
  );
}
