import { Telegraf } from "telegraf";
import { BotContext } from "../../types/context";
import { env } from "../../config/env";
import { StudentService } from "../../services/student.service";
import { PaymentService } from "../../services/payment.service";
import { NotificationService } from "../../services/notification.service";
import { formatMoney } from "../keyboards/keyboards";

/**
 * Uzbek month names for human-readable date display.
 */
const UZ_MONTHS: Record<number, string> = {
  1: "Yanvar",
  2: "Fevral",
  3: "Mart",
  4: "Aprel",
  5: "May",
  6: "Iyun",
  7: "Iyul",
  8: "Avgust",
  9: "Sentabr",
  10: "Oktabr",
  11: "Noyabr",
  12: "Dekabr",
};

/**
 * Convert a "YYYY-MM" string to Uzbek format.
 * @example formatMonthName("2026-07") → "Iyul, 2026"
 */
export function formatMonthName(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  const monthNum = parseInt(monthStr, 10);
  const monthName = UZ_MONTHS[monthNum] || monthStr;
  return `${monthName}, ${yearStr}`;
}

/**
 * Register payment-related handlers:
 * - Inline button callback for initiating payment
 * - pre_checkout_query for validation
 * - successful_payment for confirmation
 */
export function registerPaymentHandlers(bot: Telegraf<BotContext>): void {
  const notificationService = new NotificationService(bot);

  // ─── "To'lov qilish" button callback ────────────────────────────
  bot.action(/^pay_(\d+)$/, async (ctx) => {
    try {
      const enrollmentId = parseInt(ctx.match[1], 10);

      // Get enrollment details
      const enrollment = await StudentService.getEnrollment(enrollmentId);
      if (!enrollment) {
        await ctx.answerCbQuery("❌ Kurs ma'lumotlari topilmadi.", {
          show_alert: true,
        });
        return;
      }

      const { student, course } = enrollment;
      const currentMonth = PaymentService.getCurrentYearMonth();

      // Check if already paid for this month
      const alreadyPaid = await PaymentService.hasStudentPaidForMonth(
        student.id,
        currentMonth
      );

      if (alreadyPaid) {
        await ctx.answerCbQuery(
          `✅ ${student.fullName} — ${course.name} uchun bu oylik to'lov allaqachon amalga oshirilgan.`,
          { show_alert: true }
        );
        return;
      }

      // Create pending payment record
      const payment = await PaymentService.createPendingPayment({
        studentId: student.id,
        amount: course.monthlyFee,
        paymentMonth: currentMonth,
        description: `${course.name} — ${currentMonth}`,
      });

      // Build invoice payload (contains IDs for post-payment processing)
      const payload = JSON.stringify({
        paymentId: payment.id,
        studentId: student.id,
        enrollmentId: enrollment.id,
        courseId: course.id,
      });

      const title = `${course.name} — oylik to'lov`;
      const description = `👤 O'quvchi: ${student.fullName}\n📚 Fan: ${course.name}\n👨‍🏫 O'qituvchi: ${course.teacherName}\n🗓 To'lov oyi: ${formatMonthName(currentMonth)}`;

      // Send invoice via Telegram Payments API
      await ctx.replyWithInvoice({
        title,
        description,
        payload,
        provider_token: env.PROVIDER_TOKEN,
        currency: "UZS",
        prices: [
          {
            label: `${course.name} (${currentMonth})`,
            amount: course.monthlyFee * 100, // Telegram expects amount in smallest currency unit
          },
        ],
        start_parameter: `pay_${enrollmentId}`,
        photo_url: undefined,
        need_phone_number: false,
        need_name: false,
      });

      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error creating payment invoice:", error);
      await ctx.answerCbQuery(
        "❌ To'lov chiqarishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
        { show_alert: true }
      );
    }
  });

  // ─── Pre-checkout query validation ───────────────────────────────
  bot.on("pre_checkout_query", async (ctx) => {
    try {
      const query = ctx.preCheckoutQuery;

      // Parse the payload to validate
      let payload: {
        paymentId: number;
        studentId: number;
        enrollmentId: number;
        courseId: number;
      };

      try {
        payload = JSON.parse(query.invoice_payload);
      } catch {
        await ctx.answerPreCheckoutQuery(false, "❌ To'lov ma'lumotlari noto'g'ri.");
        return;
      }

      // Verify the enrollment still exists and is active
      const enrollment = await StudentService.getEnrollment(
        payload.enrollmentId
      );
      if (!enrollment || !enrollment.isActive) {
        await ctx.answerPreCheckoutQuery(
          false,
          "❌ Kurs ro'yxatdan o'tkazilmagan yoki faol emas."
        );
        return;
      }

      // All checks passed — approve the payment
      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error("Error in pre_checkout_query:", error);
      await ctx.answerPreCheckoutQuery(
        false,
        "❌ Tekshiruvda xatolik yuz berdi. Qaytadan urinib ko'ring."
      );
    }
  });

  // ─── Successful payment confirmation ─────────────────────────────
  bot.on("successful_payment", async (ctx) => {
    try {
      const payment = ctx.message.successful_payment;

      // Parse the payload
      const payload = JSON.parse(payment.invoice_payload);

      // Confirm payment in the database
      const confirmedPayment = await PaymentService.confirmPayment({
        paymentId: payload.paymentId,
        telegramPaymentId: payment.telegram_payment_charge_id,
        providerPaymentId: payment.provider_payment_charge_id,
      });

      const student = confirmedPayment.student;
      const courseName =
        student.enrollments.find(
          (e) => e.courseId === payload.courseId
        )?.course.name || "Noma'lum fan";

      const teacherName =
        student.enrollments.find(
          (e) => e.courseId === payload.courseId
        )?.course.teacherName || "";

      const paidAt = confirmedPayment.paidAt || new Date();

      // 1. Send receipt to user
      await notificationService.sendReceipt(ctx.chat.id, {
        studentName: student.fullName,
        courseName,
        amount: confirmedPayment.amount,
        paymentMonth: confirmedPayment.paymentMonth,
        paidAt,
      });

      // 2. Notify admin in real-time
      await notificationService.notifyAdmin({
        studentName: student.fullName,
        courseName,
        teacherName,
        amount: confirmedPayment.amount,
        paymentMonth: confirmedPayment.paymentMonth,
        paidAt,
      });

      console.log(
        `✅ Payment confirmed: ${student.fullName} — ${courseName} — ${formatMoney(confirmedPayment.amount)} UZS`
      );
    } catch (error) {
      console.error("Error processing successful payment:", error);
      await ctx.reply(
        "⚠️ To'lov qabul qilindi, lekin ma'lumotlarni saqlashda xatolik yuz berdi. Iltimos, administratorga murojaat qiling."
      );
    }
  });
}
