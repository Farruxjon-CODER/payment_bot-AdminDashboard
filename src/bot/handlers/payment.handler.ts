import { Telegraf } from "telegraf";
import { BotContext, BotState } from "../../types/context";
import { env } from "../../config/env";
import { StudentService } from "../../services/student.service";
import { PaymentService } from "../../services/payment.service";
import { NotificationService } from "../../services/notification.service";
import { formatMoney } from "../keyboards/keyboards";
import { prisma } from "../../repositories/prisma.repository";

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

export async function generateInvoice(ctx: BotContext, studentId: number, customAmount: number) {
  try {
    const student = await StudentService.getStudentById(studentId);
    if (!student) {
      await ctx.reply("❌ O'quvchi ma'lumotlari topilmadi.");
      return;
    }

    const currentMonth = PaymentService.getCurrentYearMonth();
    const courseName = student.groupName || "O'quv kursi";
    const teacherName = student.teacher || "O'qituvchi";

    // Create pending payment record with the custom amount
    const payment = await PaymentService.createPendingPayment({
      studentId: student.id,
      amount: customAmount,
      paymentMonth: currentMonth,
      description: `${courseName} — qisman to'lov (${currentMonth})`,
    });

    // Build invoice payload
    const payload = JSON.stringify({
      paymentId: payment.id,
      studentId: student.id,
    });

    const title = `${courseName} — to'lov`;
    const description = [
      `👤 O'quvchi: ${student.fullName}`,
      `📚 Fan: ${courseName}`,
      `👨‍🏫 O'qituvchi: ${teacherName}`,
      `🗓 Oylar: ${formatMonthName(currentMonth)}`
    ].join('\n');

    // Send invoice via Telegram Payments API
    await ctx.replyWithInvoice({
      title,
      description,
      payload,
      provider_token: env.PROVIDER_TOKEN,
      currency: "UZS",
      prices: [
        {
          label: `To'lov summasi`,
          amount: customAmount * 100, // Telegram expects amount in smallest currency unit (tiyin)
        },
      ],
      start_parameter: `pay_${student.id}`,
      photo_url: undefined,
      need_phone_number: false,
      need_name: false,
    });

  } catch (error) {
    console.error("Error generating custom invoice:", error);
    await ctx.reply("❌ To'lov chiqarishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
  }
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
      const studentId = parseInt(ctx.match[1], 10);

      // Get student details
      const student = await StudentService.getStudentById(studentId);
      if (!student) {
        await ctx.answerCbQuery("❌ O'quvchi topilmadi.", {
          show_alert: true,
        });
        return;
      }

      // Check if already paid for this month (optional, maybe skip if partial payments are allowed?)
      // Let's allow partial payments without checking for a strict full month lock.

      // Transition state
      ctx.session.state = BotState.AWAITING_PAYMENT_AMOUNT;
      ctx.session.studentId = student.id;

      await ctx.reply(
        "💬 Qancha to'lamoqchisiz? Iltimos, summani faqat raqamlarda kiriting:\n\n(Masalan: 200000)",
        { parse_mode: "Markdown" }
      );

      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error initiating payment:", error);
      await ctx.answerCbQuery(
        "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
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

      // Verify the student still exists
      const student = await StudentService.getStudentById(payload.studentId);
      if (!student) {
        await ctx.answerPreCheckoutQuery(
          false,
          "❌ O'quvchi topilmadi."
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
      const payload = JSON.parse(payment.invoice_payload);

      // 1. Convert Telegram API total_amount (kopecks/tiyin) to real UZS
      const paidAmount = payment.total_amount / 100;

      // 2. Fetch Current Balance from Prisma
      const student = await prisma.student.findUnique({ 
        where: { id: payload.studentId } 
      });

      if (!student) {
        throw new Error("Student not found during successful_payment processing");
      }

      // Fetch the student's Group to get the monthlyFee
      const groupName = student.groupName || "";
      const group = await prisma.group.findUnique({
        where: { name: groupName }
      });

      // @ts-ignore
      const baseFee = group?.monthlyFee || 0;

      // 3. Dynamically Calculate New Debt
      // Since the new payment is NOT confirmed in the DB yet, we fetch prior paid sums and manually add `paidAmount`.
      const priorPayments = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          studentId: student.id,
          status: "PAID",
          paymentMonth: payload.paymentMonth // Ensure it matches the month of the invoice
        }
      });
      const totalPaidSoFar = (priorPayments._sum.amount || 0) + paidAmount;

      let newDebt = baseFee - totalPaidSoFar;
      if (newDebt < 0) newDebt = 0;

      // 4. Update the Database persistently with this newDebt
      await prisma.student.update({ 
        where: { id: student.id }, 
        data: { studentBalance: newDebt } 
      });

      // Confirm payment in the database (status = PAID)
      const confirmedPayment = await PaymentService.confirmPayment({
        paymentId: payload.paymentId,
        telegramPaymentId: payment.telegram_payment_charge_id,
        providerPaymentId: payment.provider_payment_charge_id,
      });
      
      const courseName = student.groupName || "Noma'lum fan";
      const teacherName = student.teacher || "";
      const paidAt = confirmedPayment.paidAt || new Date();
      
      const formattedPaidAt = `${paidAt.toLocaleDateString('uz-UZ')} ${paidAt.toLocaleTimeString('uz-UZ')}`;
      const receiptId = `PAY-${confirmedPayment.id.toString().padStart(6, '0')}`;

      // 5. Render the Output with newDebt dynamically
      const receiptMessage = [
        `✅ <b>To'lov muvaffaqiyatli qabul qilindi!</b>`,
        ``,
        `🧾 <b>Kvitansiya:</b> #${receiptId}`,
        `👤 <b>O'quvchi:</b> ${student.fullName}`,
        `📚 <b>Guruh:</b> ${courseName}`,
        ``,
        `💰 <b>To'langan summa:</b> ${formatMoney(paidAmount)} UZS`,
        `📉 <b>Qolgan qarzdorlik:</b> ${formatMoney(newDebt)} UZS`,
        ``,
        `📅 <b>Sana:</b> ${formattedPaidAt}`,
        `<i>O'quv markazimizni tanlaganingiz uchun tashakkur!</i>`
      ].join('\n');

      await ctx.reply(receiptMessage, { parse_mode: "HTML" });

      // Notify admin in real-time
      const adminMessage = [
        `🔔 <b>Yangi to'lov qabul qilindi!</b>`,
        ``,
        `🧾 <b>Kvitansiya:</b> #${receiptId}`,
        `👤 <b>O'quvchi:</b> ${student.fullName}`,
        `📚 <b>Guruh:</b> ${courseName}`,
        `👨‍🏫 <b>O'qituvchi:</b> ${teacherName}`,
        ``,
        `💰 <b>To'langan summa:</b> ${formatMoney(paidAmount)} UZS`,
        `📉 <b>Qolgan qarzdorlik:</b> ${formatMoney(newDebt)} UZS`,
        ``,
        `📅 <b>Sana:</b> ${formattedPaidAt}`
      ].join('\n');

      const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
      if (ADMIN_CHAT_ID) {
        const adminIds = ADMIN_CHAT_ID.split(',').map(id => id.trim());
        for (const adminId of adminIds) {
          try {
            await ctx.telegram.sendMessage(adminId, adminMessage, { parse_mode: "HTML" });
          } catch (e) {
            console.error(`Failed to notify admin ${adminId}:`, e);
          }
        }
      }

      console.log(
        `✅ Payment confirmed: ${student.fullName} — ${courseName} — ${formatMoney(paidAmount)} UZS`
      );
    } catch (error) {
      console.error("Error processing successful payment:", error);
      await ctx.reply(
        "⚠️ To'lov qabul qilindi, lekin ma'lumotlarni saqlashda xatolik yuz berdi. Iltimos, administratorga murojaat qiling."
      );
    }
  });
}
