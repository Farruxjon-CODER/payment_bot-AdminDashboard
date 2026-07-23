import { db } from "@/lib/db";
import { GroupTable } from "./client";
import { FilterSelect } from "@/components/filters/FilterSelect";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CoursesPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q as string | undefined;
  const teacherFilter = resolvedParams?.teacher as string | undefined;

  const whereClause: any = {};

  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { teacher: { contains: query, mode: "insensitive" } },
    ];
  }

  if (teacherFilter && teacherFilter !== "all") {
    whereClause.teacher = teacherFilter;
  }

  // We should check if the table is completely empty regardless of filters
  const groupCount = await db.group.count();

  // ─── Auto-extraction Fallback ──────────────────────────────────────────
  if (groupCount === 0) {
    const students = await db.student.findMany({
      select: {
        groupName: true,
        teacher: true,
        classTime: true,
      },
    });

    const uniqueGroupsMap = new Map();

    for (const student of students) {
      if (student.groupName && !uniqueGroupsMap.has(student.groupName)) {
        uniqueGroupsMap.set(student.groupName, {
          name: student.groupName,
          teacher: student.teacher || "Noma'lum",
          startTime: student.classTime || null,
          endTime: null,
          monthlyFee: 0, 
          status: "Faol",
        });
      }
    }

    const groupsToCreate = Array.from(uniqueGroupsMap.values());

    if (groupsToCreate.length > 0) {
      await db.group.createMany({
        data: groupsToCreate,
        skipDuplicates: true,
      });
    }
  }

  // Fetch filtered groups
  const groups = await db.group.findMany({
    where: whereClause,
    orderBy: {
      name: "asc",
    },
  });

  // Serialize to ensure it safely crosses the Client Boundary
  const serializedGroups = groups.map((g: any) => ({
    id: g.id,
    name: g.name,
    teacher: g.teacher,
    startTime: g.startTime,
    endTime: g.endTime,
    monthlyFee: g.monthlyFee,
    status: g.status,
  }));

  // Get unique teachers for the filter dropdown
  const allGroupsForTeachers = await db.group.findMany({
    select: { teacher: true },
    distinct: ['teacher'],
  });
  
  const teacherOptions = allGroupsForTeachers
    .filter((g) => g.teacher)
    .map((g: any) => ({
      label: g.teacher,
      value: g.teacher,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kurslar va Narxlar</h2>
          <p className="text-muted-foreground">
            Markazda mavjud bo'lgan kurslar ro'yxati va ularning oylik to'lov miqdorlari.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <FilterSelect
            paramName="teacher"
            placeholder="Barcha o'qituvchilar"
            options={teacherOptions}
          />
        </div>
      </div>
      
      <GroupTable groups={serializedGroups} />
    </div>
  );
}
