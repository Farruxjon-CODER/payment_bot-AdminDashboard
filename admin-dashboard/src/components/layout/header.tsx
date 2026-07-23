"use client";

import { Menu, Search, Bell, User as UserIcon, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/login/actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";

function formatPhone(phone: string) {
  if (!phone || phone.length < 12) return phone;
  // formats 998901234567 to +998 90 123 45 67
  const match = phone.match(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
  }
  return phone;
}

export function Header({ adminPhone = "Admin" }: { adminPhone?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex h-16 items-center px-4 border-b bg-white dark:bg-slate-950 dark:border-slate-800">
      <Button variant="ghost" size="icon" className="md:hidden">
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 flex items-center gap-4 md:ml-4">
        <GlobalSearch />
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm cursor-pointer hover:bg-primary/90 transition-colors border-none outline-none">
            A
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Administrator</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {formatPhone(adminPhone)}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="cursor-pointer p-0">
              <Link href="/profile" className="flex items-center w-full px-2 py-1.5">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profil sozlamalari</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="cursor-pointer text-red-600 focus:text-red-600 flex items-center" 
              onClick={() => startTransition(() => logoutAction())}
              disabled={isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isPending ? "Chiqilmoqda..." : "Tizimdan chiqish"}</span>
            </DropdownMenuItem>
            
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
