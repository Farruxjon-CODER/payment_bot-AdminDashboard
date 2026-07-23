import { db } from "@/lib/db";
import { StudentsTable } from "@/app/(dashboard)/students/client";
import { FilterSelect } from "@/components/filters/FilterSelect";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function StudentsPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q as string | undefined;
  const groupFilter = resolvedParams?.group as string | undefined;
  const statusFilter = resolvedParams?.status as string | undefined;

  // Build the dynamic 'where' clause
  const whereClause: any = {};

  if (query) {
    whereClause.OR = [
      { fullName: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
      { groupName: { contains: query, mode: "insensitive" } },
    ];
  }

  if (groupFilter && groupFilter !== "all") {
    whereClause.groupName = groupFilter;
  }

  if (statusFilter && statusFilter !== "all") {
    whereClause.status = statusFilter;
  }

  // Fetch filtered students
  const students = await db.student.findMany({
    where: whereClause,
    include: {
      payments: {
        where: {
          status: "PAID",
        },
      },
    },
    orderBy: {
      fullName: "asc",
    },
  });

  // Map the Prisma data to the shape the table expects
  const formattedStudents = students.map((student: any) => {
    const hasPaidAny = student.payments && student.payments.length > 0;

    return {
      id: student.id,
      fullName: student.fullName,
      phone: student.phone,
      courses: student.groupName ? [student.groupName] : [],
      isPaid: hasPaidAny,
      status: student.status || "Faol",
    };
  });

  // Fetch groups for the filter dropdown
  const dbGroups = await db.group.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const groupOptions = dbGroups.map((g: any) => ({
    label: g.name,
    value: g.name,
  }));

  const statusOptions = [
    { label: "Faol", value: "Faol" },
    { label: "Muzlatilgan", value: "Muzlatilgan" },
    { label: "Ketgan", value: "Ketgan" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">O'quvchilar</h2>
          <p className="text-muted-foreground">Markazda tahsil olayotgan barcha o'quvchilar ro'yxati.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <FilterSelect
            paramName="group"
            placeholder="Barcha guruhlar"
            options={groupOptions}
          />
          <FilterSelect
            paramName="status"
            placeholder="Barcha holatlar"
            options={statusOptions}
          />
        </div>
      </div>
      
      <StudentsTable students={formattedStudents} />
    </div>
  );
}
