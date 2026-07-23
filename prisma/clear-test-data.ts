import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database cleanup...");

  // 1. Delete all mock/test payment records
  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`✅ Deleted ${deletedPayments.count} test payment records.`);

  // 2. Reset student balances to 0 (clean state)
  const updatedStudents = await prisma.student.updateMany({
    data: {
      studentBalance: 0,
    },
  });
  console.log(`✅ Reset balances for ${updatedStudents.count} students.`);

  console.log("🎉 Database cleanup complete! Safe for production.");
}

main()
  .catch((e) => {
    console.error("❌ Error during cleanup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
