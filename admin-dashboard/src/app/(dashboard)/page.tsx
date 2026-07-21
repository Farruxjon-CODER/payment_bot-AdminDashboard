import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CreditCard } from "lucide-react";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const totalStudents = await db.student.count();
  const activeCourses = await db.course.count({ where: { isActive: true } });
  
  // Calculate revenue from payments (sum of amounts where status is 'PAID')
  // We handle amount carefully since it might be empty if we don't have paid items yet
  const revenueAggregation = await db.payment.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      status: "PAID",
    },
  });

  const totalRevenue = revenueAggregation._sum.amount || 0;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jami O'quvchilar</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Markazdagi barcha o'quvchilar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faol Kurslar</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCourses}</div>
            <p className="text-xs text-muted-foreground">Hozirda o'tilayotgan darslar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Umumiy Tushum (PAID)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("uz-UZ").format(totalRevenue)} UZS
            </div>
            <p className="text-xs text-muted-foreground">To'langan to'lovlar summasi</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
