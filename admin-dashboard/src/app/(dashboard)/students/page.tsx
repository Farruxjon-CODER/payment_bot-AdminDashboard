import { db } from "@/lib/db";
import { StudentsTable } from "@/app/(dashboard)/students/client";

export default async function StudentsPage() {
  const students = await db.student.findMany({
    include: {
      user: true,
      enrollments: {
        include: {
          course: true,
        }
      },
      payments: {
        where: {
          status: "PAID"
        }
      }
    }
  });

  // Map the Prisma data to the shape the table expects
  const formattedStudents = students.map((student: any) => {
    // Check if they have any paid payments (simplified logic)
    const hasPaidAny = student.payments.length > 0;

    return {
      id: student.id,
      fullName: student.fullName,
      phone: student.user.phone,
      courses: student.enrollments.map((e: any) => e.course.name),
      isPaid: hasPaidAny,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">O'quvchilar</h2>
        <p className="text-muted-foreground">Markazda tahsil olayotgan barcha o'quvchilar ro'yxati.</p>
      </div>
      <StudentsTable students={formattedStudents} />
    </div>
  );
}
