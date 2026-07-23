import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper to extract strictly ONLY digits from phone numbers
function normalizePhone(phone: any): string {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  // If user only typed 9 digits (e.g. 901234567), prefix with 998 automatically
  if (digits.length === 9) {
    return `998${digits}`;
  }
  return digits;
}

// Helper to safely parse numbers
function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

// Helper to parse dates correctly from Excel serial numbers or strings
function parseDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel date serial number
    return new Date((val - (25567 + 2)) * 86400 * 1000);
  }
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
}

async function seedGroups() {
  const filePath = path.join(process.cwd(), "Guruhlar.xlsx");
  console.log(`Reading Groups from ${filePath}...`);
  
  try {
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<any>(worksheet);
    
    console.log(`Found ${rows.length} groups to process.`);

    for (const row of rows) {
      // Best-effort mapping of Uzbek headers to Prisma model
      const name = row["Guruh nomi"] || row["Guruh"] || row["Name"] || row["name"];
      if (!name) continue; // Skip if no group name

      await prisma.group.upsert({
        where: { name: String(name).trim() },
        update: {
          course: row["Kurs"] || row["Course"] ? String(row["Kurs"] || row["Course"]) : null,
          teacher: row["O'qituvchi"] || row["Teacher"] ? String(row["O'qituvchi"] || row["Teacher"]) : null,
          branch: row["Filial"] || row["Branch"] ? String(row["Filial"] || row["Branch"]) : null,
          room: row["Xona"] || row["Room"] ? String(row["Xona"] || row["Room"]) : null,
          startTime: row["Boshlash Vaqti"] || row["Boshlanish vaqti"] ? String(row["Boshlash Vaqti"] || row["Boshlanish vaqti"]) : null,
          endTime: row["Tugash Vaqti"] || row["Tugash vaqti"] ? String(row["Tugash Vaqti"] || row["Tugash vaqti"]) : null,
          startDate: parseDate(row["Boshlanish sanasi"] || row["Start Date"]),
          endDate: parseDate(row["Tugash sanasi"] || row["End Date"]),
          activeStudents: parseNumber(row["Aktiv o'quvchilar"] || row["O'quvchilar soni"]),
          status: row["Status"] || row["Holati"] ? String(row["Status"] || row["Holati"]) : null,
        },
        create: {
          name: String(name).trim(),
          course: row["Kurs"] || row["Course"] ? String(row["Kurs"] || row["Course"]) : null,
          teacher: row["O'qituvchi"] || row["Teacher"] ? String(row["O'qituvchi"] || row["Teacher"]) : null,
          branch: row["Filial"] || row["Branch"] ? String(row["Filial"] || row["Branch"]) : null,
          room: row["Xona"] || row["Room"] ? String(row["Xona"] || row["Room"]) : null,
          startTime: row["Boshlash Vaqti"] || row["Boshlanish vaqti"] ? String(row["Boshlash Vaqti"] || row["Boshlanish vaqti"]) : null,
          endTime: row["Tugash Vaqti"] || row["Tugash vaqti"] ? String(row["Tugash Vaqti"] || row["Tugash vaqti"]) : null,
          startDate: parseDate(row["Boshlanish sanasi"] || row["Start Date"]),
          endDate: parseDate(row["Tugash sanasi"] || row["End Date"]),
          activeStudents: parseNumber(row["Aktiv o'quvchilar"] || row["O'quvchilar soni"]),
          status: row["Status"] || row["Holati"] ? String(row["Status"] || row["Holati"]) : null,
        }
      });
    }
    console.log("Groups successfully seeded.");
  } catch (error) {
    console.error("Failed to seed Groups:", error);
  }
}

async function seedStudents() {
  const filePath = path.join(process.cwd(), "students_9a7f1dbd6e3b4daab109ab4a6eb046c4.xlsx");
  console.log(`Reading Students from ${filePath}...`);
  
  try {
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<any>(worksheet);
    
    console.log(`Found ${rows.length} students to process.`);

    for (const row of rows) {
      const rawPhone = row["Telefon raqam"] || row["Telefon"] || row["Phone"];
      if (!rawPhone) continue; // Skip if no phone

      const phone = normalizePhone(rawPhone);
      if (!phone) continue;

      const fullName = row["Ism familiya"] || row["F.I.SH."] || row["F.I.O"] || row["Name"] || "Unknown";

      await prisma.student.upsert({
        where: { phone },
        update: {
          excelId: row["ID"] ? parseNumber(row["ID"]) : null,
          fullName: String(fullName),
          score: row["Ball"] || row["Score"] ? parseNumber(row["Ball"] || row["Score"]) : null,
          note: row["Izoh"] || row["Note"] ? String(row["Izoh"] || row["Note"]) : null,
          groupName: row["Guruh"] || row["Group"] ? String(row["Guruh"] || row["Group"]) : null,
          classTime: row["Dars vaqti"] || row["Class Time"] ? String(row["Dars vaqti"] || row["Class Time"]) : null,
          teacher: row["O'qituvchi"] || row["Teacher"] ? String(row["O'qituvchi"] || row["Teacher"]) : null,
          nextPaymentInfo: row["Keyingi to'lov"] || row["Next Payment"] ? String(row["Keyingi to'lov"] || row["Next Payment"]) : null,
          groupBalance: row["Guruh balansi"] || row["Group Balance"] ? parseNumber(row["Guruh balansi"] || row["Group Balance"]) : null,
          studentBalance: row["O'quvchi balansi"] || row["Student Balance"] ? parseNumber(row["O'quvchi balansi"] || row["Student Balance"]) : null,
          status: row["Status"] || row["Holati"] ? String(row["Status"] || row["Holati"]) : null,
        },
        create: {
          phone,
          excelId: row["ID"] ? parseNumber(row["ID"]) : null,
          fullName: String(fullName),
          score: row["Ball"] || row["Score"] ? parseNumber(row["Ball"] || row["Score"]) : null,
          note: row["Izoh"] || row["Note"] ? String(row["Izoh"] || row["Note"]) : null,
          groupName: row["Guruh"] || row["Group"] ? String(row["Guruh"] || row["Group"]) : null,
          classTime: row["Dars vaqti"] || row["Class Time"] ? String(row["Dars vaqti"] || row["Class Time"]) : null,
          teacher: row["O'qituvchi"] || row["Teacher"] ? String(row["O'qituvchi"] || row["Teacher"]) : null,
          nextPaymentInfo: row["Keyingi to'lov"] || row["Next Payment"] ? String(row["Keyingi to'lov"] || row["Next Payment"]) : null,
          groupBalance: row["Guruh balansi"] || row["Group Balance"] ? parseNumber(row["Guruh balansi"] || row["Group Balance"]) : null,
          studentBalance: row["O'quvchi balansi"] || row["Student Balance"] ? parseNumber(row["O'quvchi balansi"] || row["Student Balance"]) : null,
          status: row["Status"] || row["Holati"] ? String(row["Status"] || row["Holati"]) : null,
        }
      });
    }
    console.log("Students successfully seeded.");
  } catch (error) {
    console.error("Failed to seed Students:", error);
  }
}

async function main() {
  await seedGroups();
  await seedStudents();
  console.log("All data successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
