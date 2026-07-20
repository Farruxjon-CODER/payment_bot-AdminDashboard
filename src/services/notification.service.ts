import { Telegraf } from "telegraf";
import { env } from "../config/env";
import { BotContext } from "../types/context";
import { formatMoney } from "../bot/keyboards/keyboards";
import { PaymentService } from "./payment.service";

/**
 * Service for sending notifications to users, admins, and directors.
 */
export class NotificationService {
  private bot: Telegraf<BotContext>;

  constructor(bot: Telegraf<BotContext>) {
    this.bot = bot;
  }

  /**
   * Send a digital receipt to the user after successful payment.
   */
  async sendReceipt(
    chatId: number,
    data: {
      studentName: string;
      courseName: string;
      amount: number;
      paymentMonth: string;
      paidAt: Date;
    }
  ): Promise<void> {
    const receipt = [
      `✅ *To'lov muvaffaqiyatli amalga oshirildi!*`,
      ``,
      `🧾 *Kvitansiya:*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👤 O'quvchi: *${this.escapeMarkdown(data.studentName)}*`,
      `📚 Fan: *${this.escapeMarkdown(data.courseName)}*`,
      `💰 Summa: *${formatMoney(data.amount)} so'm*`,
      `📅 To'lov oyi: *${data.paymentMonth}*`,
      `🕐 Sana: *${this.formatDate(data.paidAt)}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Rahmat! 🙏`,
    ].join("\n");

    try {
      await this.bot.telegram.sendMessage(chatId, receipt, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Failed to send receipt:", error);
    }
  }

  /**
   * Send real-time payment notification to the admin.
   */
  async notifyAdmin(data: {
    studentName: string;
    courseName: string;
    teacherName: string;
    amount: number;
    paymentMonth: string;
    paidAt: Date;
  }): Promise<void> {
    const adminChatId = env.ADMIN_CHAT_ID;

    const message = [
      `🔔 *Yangi to'lov qabul qilindi!*`,
      ``,
      `👤 O'quvchi: *${this.escapeMarkdown(data.studentName)}*`,
      `📚 Fan: *${this.escapeMarkdown(data.courseName)}*`,
      `👨‍🏫 O'qituvchi: *${this.escapeMarkdown(data.teacherName)}*`,
      `💰 Summa: *${formatMoney(data.amount)} so'm*`,
      `📅 To'lov oyi: *${data.paymentMonth}*`,
      `🕐 Vaqt: *${this.formatDate(data.paidAt)}*`,
    ].join("\n");

    try {
      await this.bot.telegram.sendMessage(adminChatId, message, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Failed to notify admin:", error);
    }
  }

  /**
   * Send daily report to the director/management.
   */
  async sendDailyReport(): Promise<void> {
    const directorChatId = env.DIRECTOR_CHAT_ID;
    if (!directorChatId) {
      console.warn("DIRECTOR_CHAT_ID not set, skipping daily report.");
      return;
    }

    try {
      const stats = await PaymentService.getDailyStats();

      const report = [
        `📊 *Kunlik hisobot*`,
        `📅 Sana: *${this.formatDate(stats.date)}*`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━`,
        `💰 Jami tushumlar: *${formatMoney(stats.totalAmount)} so'm*`,
        `👥 To'lov qilganlar soni: *${stats.paidCount} ta*`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ];

      if (stats.payments.length > 0) {
        report.push(``, `📝 *To'lovlar ro'yxati:*`);
        stats.payments.forEach((p, i) => {
          report.push(
            `${i + 1}. ${p.student.fullName} — ${formatMoney(p.amount)} so'm`
          );
        });
      }

      await this.bot.telegram.sendMessage(directorChatId, report.join("\n"), {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Failed to send daily report:", error);
    }
  }

  /**
   * Send monthly report to the director/management.
   */
  async sendMonthlyReport(): Promise<void> {
    const directorChatId = env.DIRECTOR_CHAT_ID;
    if (!directorChatId) return;

    try {
      const stats = await PaymentService.getMonthlyStats();

      const report = [
        `📊 *Oylik hisobot*`,
        `📅 Oy: *${stats.yearMonth}*`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━`,
        `💰 Jami tushumlar: *${formatMoney(stats.totalAmount)} so'm*`,
        `👥 To'lov qilganlar: *${stats.paidCount} ta*`,
        `👥 Jami o'quvchilar: *${stats.totalStudents} ta*`,
        `📈 To'lov foizi: *${stats.totalStudents > 0 ? Math.round((stats.paidCount / stats.totalStudents) * 100) : 0}%*`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n");

      await this.bot.telegram.sendMessage(directorChatId, report, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Failed to send monthly report:", error);
    }
  }

  /**
   * Escape special Markdown characters.
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
  }

  /**
   * Format date to Uzbek-friendly format.
   */
  private formatDate(date: Date): string {
    return date.toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tashkent",
    });
  }
}
