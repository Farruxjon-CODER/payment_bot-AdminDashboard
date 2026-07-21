"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const initialState = {
  error: null,
};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="px-6 py-3 rounded-xl bg-gray-900 text-white font-black text-2xl tracking-wider shadow-md flex items-center justify-center">
              OFEDU
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Xush kelibsiz
          </CardTitle>
          <CardDescription>
            Boshqaruv paneliga kirish uchun ma'lumotlaringizni kiriting
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state.error && (
              <div className="p-3 text-sm font-medium bg-red-500/10 text-red-600 rounded-md text-center">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon raqam</Label>
              <Input
                id="phone"
                name="phone"
                type="text"
                placeholder="998901234567"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
                pattern="[0-9]*"
                maxLength={8}
                required
                disabled={isPending}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Kirilmoqda..." : "Kirish"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
