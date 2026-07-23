import { PaymentStatus } from "@prisma/client";
import { prisma } from "../repositories/prisma.repository";

/**
 * Service for payment-related database operations.
 */
export class PaymentService {
  /**
   * Create a pending payment record before sending the invoice.
   */
  static async createPendingPayment(data: {
    studentId: number;
    amount: number;
    paymentMonth: string;
    description?: string;
  }) {
    return prisma.payment.create({
      data: {
        studentId: data.studentId,
        amount: data.amount,
        currency: "UZS",
        status: PaymentStatus.PENDING,
        paymentMonth: data.paymentMonth,
        description: data.description,
      },
    });
  }

  /**
   * Confirm a payment after successful Telegram payment.
   * Updates status to PAID and stores Telegram/provider payment IDs.
   */
  static async confirmPayment(data: {
    paymentId: number;
    telegramPaymentId: string;
    providerPaymentId?: string;
  }) {
    return prisma.payment.update({
      where: { id: data.paymentId },
      data: {
        status: PaymentStatus.PAID,
        telegramPaymentId: data.telegramPaymentId,
        providerPaymentId: data.providerPaymentId,
        paidAt: new Date(),
      },
      include: {
        student: true, // Flat schema: no enrollments or user relation
      },
    });
  }

  /**
   * Mark a payment as failed.
   */
  static async failPayment(paymentId: number) {
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
      },
    });
  }

  /**
   * Get daily payment statistics.
   */
  static async getDailyStats(date?: Date) {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [payments, totalAmount, paidCount] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID,
          paidAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          student: true,
        },
        orderBy: { paidAt: "desc" },
      }),
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          paidAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        _sum: { amount: true },
      }),
      prisma.payment.count({
        where: {
          status: PaymentStatus.PAID,
          paidAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
    ]);

    return {
      payments,
      totalAmount: totalAmount._sum.amount || 0,
      paidCount,
      date: targetDate,
    };
  }

  /**
   * Get monthly payment statistics.
   */
  static async getMonthlyStats(yearMonth?: string) {
    const target = yearMonth || this.getCurrentYearMonth();
    const [year, month] = target.split("-").map(Number);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const [totalAmount, paidCount, totalStudents] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          paidAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { amount: true },
      }),
      prisma.payment.count({
        where: {
          status: PaymentStatus.PAID,
          paidAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      prisma.student.count(),
    ]);

    return {
      yearMonth: target,
      totalAmount: totalAmount._sum.amount || 0,
      paidCount,
      totalStudents,
    };
  }

  /**
   * Get current year-month string (e.g. "2026-07").
   */
  static getCurrentYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  /**
   * Check if a student has already paid for a specific month.
   */
  static async hasStudentPaidForMonth(
    studentId: number,
    yearMonth: string
  ): Promise<boolean> {
    const payment = await prisma.payment.findFirst({
      where: {
        studentId,
        paymentMonth: yearMonth,
        status: PaymentStatus.PAID,
      },
    });
    return !!payment;
  }
}
