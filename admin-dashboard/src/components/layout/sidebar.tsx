"use client";

import { useState } from "react";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookOpen, CreditCard, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const routes = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    href: "/",
    color: "text-sky-500",
  },
  {
    label: "O'quvchilar",
    icon: Users,
    href: "/students",
    color: "text-violet-500",
  },
  {
    label: "Kurslar va Narxlar",
    icon: BookOpen,
    href: "/courses",
    color: "text-pink-700",
  },
  {
    label: "To'lovlar",
    icon: CreditCard,
    href: "/payments",
    color: "text-emerald-500",
  },
  {
    label: "Profil",
    icon: UserCircle,
    href: "/profile",
    color: "text-slate-400",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/" className="flex items-center pl-3 mb-14 gap-3">
          {!imgError ? (
            /* Using a standard <img> tag instead of next/image to prevent server crashes 
               if the logo file doesn't exist in the public directory yet */
            <img 
              src="/logo.jpg" 
              alt="OFEDU Logo" 
              width={40} 
              height={40} 
              className="rounded-lg object-cover bg-white/10"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              O
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold leading-tight">OFEDU Admin</h1>
            <p className="text-xs text-zinc-400 font-medium">Learning Centre</p>
          </div>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              href={route.href}
              key={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href
                  ? "text-white bg-white/10"
                  : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
