import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Educational Center Admin Dashboard",
  description: "Admin panel for Educational Center CRM",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
