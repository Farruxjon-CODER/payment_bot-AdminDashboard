import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("admin_session")?.value;
  
  let adminPhone = "Admin";
  if (sessionId) {
    const admin = await db.admin.findUnique({
      where: { id: parseInt(sessionId) }
    });
    if (admin) {
      adminPhone = admin.phone;
    }
  }

  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80">
        <Sidebar />
      </div>
      <main className="md:pl-72 h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Header adminPhone={adminPhone} />
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
