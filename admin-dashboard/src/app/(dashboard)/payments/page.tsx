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
import { FilterSelect } from "@/components/filters/FilterSelect";

const statusMap: Record<string, { label: string; className: string }> = {
  PAID: {
    label: "To'langan",
    className: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-none border-none",
  },
  PENDING: {
    label: "Kutilmoqda",
    className: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 shadow-none border-none",
  },
  FAILED: {
    label: "Xatolik",
    className: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 shadow-none border-none",
  },
  REFUNDED: {
    label: "Qaytarilgan",
    className: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 shadow-none border-none",
  },
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PaymentsPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q as string | undefined;
  const statusFilter = resolvedParams?.status as string | undefined;

  const whereClause: any = {};

  if (query) {
    whereClause.student = {
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    };
  }

  if (statusFilter && statusFilter !== "all") {
    // Wait, prisma ENUM might need a cast, but typically passing the string works directly in Prisma Client
    whereClause.status = statusFilter as any;
  }

  const payments = await db.payment.findMany({
    where: whereClause,
    include: {
      student: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const statusOptions = [
    { label: "To'langan", value: "PAID" },
    { label: "Kutilmoqda", value: "PENDING" },
    { label: "Xatolik", value: "FAILED" },
    { label: "Qaytarilgan", value: "REFUNDED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">To&apos;lovlar</h2>
          <p className="text-muted-foreground">
            Telegram bot orqali qilingan barcha to&apos;lovlar tarixi.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <FilterSelect
            paramName="status"
            placeholder="Barcha holatlar"
            options={statusOptions}
          />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
                const courseName = payment.student?.groupName || "—";

                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {payment.student?.fullName || "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">{courseName}</TableCell>
                    <TableCell className="text-slate-900 dark:text-slate-100 font-medium">
                      {new Intl.NumberFormat("uz-UZ").format(payment.amount)}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">{payment.paymentMonth}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">
                      {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleString("uz-UZ", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : new Date(payment.createdAt).toLocaleString("uz-UZ", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
