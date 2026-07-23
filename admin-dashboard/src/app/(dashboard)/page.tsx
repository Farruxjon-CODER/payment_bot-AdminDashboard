import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CreditCard, UserMinus, PlusCircle, Search, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { RevenueChart } from "@/components/RevenueChart";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  let totalStudents = 0;
  let totalDebtors = 0;
  let activeCourses = 0;
  let currentMonthRevenue = 0;
  let aggregatedData: { date: string; amount: number }[] = [];
  let topDebtors: any[] = [];

  try {
    // 1. Total Students
    totalStudents = await db.student.count();
    
    // 2. We will compute totalDebtors dynamically below

    // 3. Active Courses
    activeCourses = await db.group.count({ 
      where: { status: { in: ["Active", "Faol"] } } 
    });
    
    // 4. Current Month Revenue
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const revenueAggregation = await db.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
    });

    currentMonthRevenue = revenueAggregation._sum.amount || 0;

    // 5. Chart Aggregation
    const payments = await db.payment.findMany({
      where: { status: "PAID" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, amount: true, paidAt: true },
    });

    const revenueMap = new Map<string, number>();
    payments.forEach((payment) => {
      const dateObj = payment.paidAt ? new Date(payment.paidAt) : new Date(payment.createdAt);
      const dateStr = `${String(dateObj.getDate()).padStart(2, "0")}.${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      const current = revenueMap.get(dateStr) || 0;
      revenueMap.set(dateStr, current + payment.amount);
    });

    aggregatedData = Array.from(revenueMap.entries()).map(([date, amount]) => ({
      date, amount,
    }));

    // 6. Top Debtors List (Dynamically calculated based on exact bot logic)
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const studentsWithPayments = await db.student.findMany({
      select: { 
        id: true, 
        fullName: true, 
        phone: true, 
        groupName: true,
        payments: {
          where: { status: "PAID", paymentMonth: currentMonthStr },
          select: { amount: true }
        }
      }
    });

    const groupsList = await db.group.findMany();
    const groupFeeMap = new Map(groupsList.map(g => [g.name, g.monthlyFee || 0]));

    const computedDebtors = studentsWithPayments.map(student => {
      const baseFee = student.groupName ? (groupFeeMap.get(student.groupName) || 0) : 0;
      const totalPaidThisMonth = student.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        ...student,
        currentDebt: Math.max(0, baseFee - totalPaidThisMonth)
      };
    }).filter(s => s.currentDebt > 0);

    totalDebtors = computedDebtors.length;
    topDebtors = computedDebtors
      .sort((a, b) => b.currentDebt - a.currentDebt)
      .slice(0, 5);

  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
      
      {/* 4 Top Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jami O'quvchilar</CardTitle>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-full">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-slate-100">{totalStudents}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Markazdagi barcha o'quvchilar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Jami Qarzdorlar</CardTitle>
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-full">
              <UserMinus className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-slate-100">{totalDebtors}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">To'lovi kechiktirilganlar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faol Guruhlar</CardTitle>
            <div className="p-2 bg-sky-50 dark:bg-sky-500/10 rounded-full">
              <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-slate-100">{activeCourses}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hozirda o'tilayotgan darslar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Shu Oydagi Tushum</CardTitle>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-full">
              <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {new Intl.NumberFormat("uz-UZ").format(currentMonthRevenue)} UZS
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Oylik muvaffaqiyatli to'lovlar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area (Chart + Sidebar Panels) */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Left Col: Revenue Chart (Takes up 2 cols) */}
        <div className="md:col-span-2">
          <RevenueChart data={aggregatedData} />
        </div>

        {/* Right Col: Quick Actions & Debtors (Takes up 1 col) */}
        <div className="space-y-4">
          
          <Card>
            <CardHeader>
              <CardTitle>Tezkor amallar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/payments" passHref>
                <Button variant="outline" className="w-full justify-start font-normal border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <PlusCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  To'lovni ko'rish / kiritish
                </Button>
              </Link>
              <Link href="/students" passHref>
                <Button variant="outline" className="w-full justify-start font-normal border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Search className="mr-2 h-4 w-4 text-sky-500" />
                  O'quvchi qidirish
                </Button>
              </Link>
              <Link href="/courses" passHref>
                <Button variant="outline" className="w-full justify-start font-normal border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <FileText className="mr-2 h-4 w-4 text-indigo-500" />
                  Guruhlar hisoboti
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eng ko'p qarzdorlar</CardTitle>
            </CardHeader>
            <CardContent>
              {topDebtors.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Qarzdorlar yo'q. Ajoyib!
                </div>
              ) : (
                <div className="space-y-4">
                  {topDebtors.map((student) => (
                    <div key={student.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none dark:text-slate-200">{student.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{student.groupName || "Noma'lum guruh"}</p>
                      </div>
                      <div className="text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md">
                        {new Intl.NumberFormat("uz-UZ").format(student.currentDebt)} UZS
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
