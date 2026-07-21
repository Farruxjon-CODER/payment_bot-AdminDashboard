import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  const phone = "998777405717";
  const password = "12345678"; // Plain text as per action requirement

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { phone },
  });

  if (existingAdmin) {
    console.log(`✅ Admin user with phone ${phone} already exists.`);
  } else {
    await prisma.admin.create({
      data: {
        phone,
        password,
      },
    });
    console.log(`✅ Successfully created default Admin (Phone: ${phone})`);
  }

  console.log("✅ Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
