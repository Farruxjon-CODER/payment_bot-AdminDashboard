import { db } from "@/lib/db";
import { CoursesGrid } from "./client";

export default async function CoursesPage() {
  const courses = await db.course.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Kurslar va Narxlar</h2>
        <p className="text-muted-foreground">Markazda mavjud bo'lgan kurslar ro'yxati va ularning oylik to'lov miqdorlari.</p>
      </div>
      <CoursesGrid courses={courses} />
    </div>
  );
}
