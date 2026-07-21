import { prisma } from "../repositories/prisma.repository";

/**
 * Service for student-related database operations.
 */
export class StudentService {
  /**
   * Normalize phone number to +998XXXXXXXXX format.
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
   * Find students by phone number.
   * Returns students with their enrollments, courses, and latest payment info.
   */
  static async findByPhone(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: {
        students: {
          include: {
            enrollments: {
              where: { isActive: true },
              include: {
                course: true,
              },
            },
            payments: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    return user;
  }

  /**
   * Register or update a Telegram user with their phone number.
   */
  static async upsertUser(data: {
    telegramId: number;
    phone: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }) {
    const normalizedPhone = this.normalizePhone(data.phone);

    return prisma.user.upsert({
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
      include: {
        students: {
          include: {
            enrollments: {
              where: { isActive: true },
              include: {
                course: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get enrollment by ID with student and course data.
   */
  static async getEnrollment(enrollmentId: number) {
    return prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        course: true,
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
        user: true,
        enrollments: {
          where: { isActive: true },
          include: { course: true },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }
}
