import { db } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const statusMap: Record<string, { label: string; className: string }> = {
  PAID: {
    label: "To'langan",
    className: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-none",
  },
  PENDING: {
    label: "Kutilmoqda",
    className: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 shadow-none border-none",
  },
  FAILED: {
    label: "Xatolik",
    className: "bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-none border-none",
  },
  REFUNDED: {
    label: "Qaytarilgan",
    className: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 shadow-none border-none",
  },
};

export default async function PaymentsPage() {
  const payments = await db.payment.findMany({
    include: {
      student: {
        include: {
          enrollments: {
            include: {
              course: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">To&apos;lovlar</h2>
        <p className="text-muted-foreground">
          Telegram bot orqali qilingan barcha to&apos;lovlar tarixi.
        </p>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>O&apos;quvchi</TableHead>
              <TableHead>Kurs</TableHead>
              <TableHead>Summa (UZS)</TableHead>
              <TableHead>To&apos;lov oyi</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead>Holati</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Hozircha to&apos;lovlar mavjud emas.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => {
                const status = statusMap[payment.status] ?? statusMap.PENDING;
                // Find the first course name for this student (simplified)
                const courseName =
                  payment.student.enrollments[0]?.course?.name ?? "—";

                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.student.fullName}
                    </TableCell>
                    <TableCell>{courseName}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("uz-UZ").format(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.paymentMonth}</TableCell>
                    <TableCell>
                      {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleDateString("uz-UZ")
                        : new Date(payment.createdAt).toLocaleDateString(
                            "uz-UZ"
                          )}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className}>
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
