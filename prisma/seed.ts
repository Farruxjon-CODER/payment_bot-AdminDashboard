import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed the database with sample data for testing.
 * Creates courses, a user, a student, and enrollments.
 */
async function seed(): Promise<void> {
  console.log("🌱 Seeding database...");

  // ─── Clear existing data ─────────────────────────────────────────
  await prisma.admin.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // ─── Create courses ──────────────────────────────────────────────
  const mathCourse = await prisma.course.create({
    data: {
      name: "Matematika",
      teacherName: "Abdullayev Sardor",
      schedule: "Dush-Chor-Juma 14:00-15:30",
      monthlyFee: 500000, // 500,000 UZS
      description: "Matematika asoslari va olimpiada tayyorgarlik",
      isActive: true,
    },
  });

  const englishCourse = await prisma.course.create({
    data: {
      name: "Ingliz tili",
      teacherName: "Karimova Nilufar",
      schedule: "Sesh-Pay-Shan 10:00-11:30",
      monthlyFee: 600000, // 600,000 UZS
      description: "General English — Intermediate level",
      isActive: true,
    },
  });

  const physicsCourse = await prisma.course.create({
    data: {
      name: "Fizika",
      teacherName: "Toshmatov Jamshid",
      schedule: "Dush-Chor 16:00-17:30",
      monthlyFee: 450000, // 450,000 UZS
      description: "Fizika kursi — Abituriyentlar uchun",
      isActive: true,
    },
  });

  console.log("  ✅ Courses created");

  // ─── Create sample user (parent) ────────────────────────────────
  // IMPORTANT: Replace this phone number with a real one for testing
  const parentUser = await prisma.user.create({
    data: {
      telegramId: BigInt(123456789), // Replace with real Telegram ID
      phone: "+998901234567", // Replace with real phone number
      firstName: "Olimov",
      lastName: "Farhod",
    },
  });

  console.log("  ✅ User created");

  // ─── Create students ────────────────────────────────────────────
  const student1 = await prisma.student.create({
    data: {
      fullName: "Olimov Asilbek",
      userId: parentUser.id,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      fullName: "Olimova Madina",
      userId: parentUser.id,
    },
  });

  console.log("  ✅ Students created");

  // ─── Create enrollments ──────────────────────────────────────────
  await prisma.enrollment.createMany({
    data: [
      { studentId: student1.id, courseId: mathCourse.id, isActive: true },
      { studentId: student1.id, courseId: englishCourse.id, isActive: true },
      { studentId: student2.id, courseId: englishCourse.id, isActive: true },
      { studentId: student2.id, courseId: physicsCourse.id, isActive: true },
    ],
  });

  console.log("  ✅ Enrollments created");

  // ─── Create Admin ────────────────────────────────────────────────
  const admin = await prisma.admin.create({
    data: {
      phone: "998777405717",
      password: "12345678",
    },
  });

  console.log("  ✅ Admin created");

  // ─── Summary ─────────────────────────────────────────────────────
  console.log("\n📋 Seed Summary:");
  console.log(`  📚 Courses: 3 (Matematika, Ingliz tili, Fizika)`);
  console.log(`  🛡️ Admins: 1 (${admin.phone})`);
  console.log(`  👤 Users: 1 (${parentUser.firstName} ${parentUser.lastName})`);
  console.log(`  🧑‍🎓 Students: 2 (${student1.fullName}, ${student2.fullName})`);
  console.log(`  📝 Enrollments: 4`);
  console.log(
    `\n⚠️  Phone number for testing: ${parentUser.phone}`
  );
  console.log(
    `⚠️  Update the phone number in prisma/seed.ts to match your Telegram account!\n`
  );

  console.log("✅ Seeding complete!");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
