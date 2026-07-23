import { prisma } from "../repositories/prisma.repository";

/**
 * Service for student-related database operations.
 */
export class StudentService {
  /**
   * Normalize phone number to 998XXXXXXXXX format.
   * Handles various input formats from Telegram contact sharing.
   */
  static normalizePhone(phone: string): string {
    // Remove all non-digit characters (including + and spaces)
    let digits = phone.replace(/\D/g, "");

    // Handle Uzbek numbers if someone only sent 9 digits
    if (digits.length === 9) {
      return `998${digits}`;
    }
    
    return digits;
  }

  /**
   * Find student by phone number directly from the new flat schema.
   */
  static async findByPhone(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);

    // Return the student record directly since the schema is flattened
    return prisma.student.findUnique({
      where: { phone: normalizedPhone },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  }

  /**
   * Register or update a Telegram user with their phone number.
   * Then return the associated Student profile.
   */
  static async upsertUser(data: {
    telegramId: number;
    phone: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }) {
    const normalizedPhone = this.normalizePhone(data.phone);

    // 1. Keep track of the Telegram User separately
    await prisma.user.upsert({
      where: { telegramId: BigInt(data.telegramId) },
      update: {
        phone: normalizedPhone,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
      },
      create: {
        telegramId: BigInt(data.telegramId),
        phone: normalizedPhone,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
      },
    });

    // 2. Return the matching Student profile from the Excel data
    return prisma.student.findUnique({
      where: { phone: normalizedPhone },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  }

  /**
   * Get a student by ID with all related data.
   */
  static async getStudentById(studentId: number) {
    return prisma.student.findUnique({
      where: { id: studentId },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  /**
   * Mocked getEnrollment to maintain compatibility with payment.handler.ts
   * Since the schema is flat, we fake an enrollment object using the student's data.
   */
  static async getEnrollment(studentId: number) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    
    if (!student) return null;
    
    return {
      id: student.id,
      isActive: true,
      student: student,
      course: {
        id: student.id,
        name: student.groupName || "O'quv kursi",
        teacherName: student.teacher || "O'qituvchi",
        schedule: student.classTime || "Noma'lum",
        monthlyFee: student.groupBalance ? Math.abs(student.groupBalance) : 0,
      }
    };
  }
}
