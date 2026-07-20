import { Telegraf } from "telegraf";
import { BotContext } from "../../types/context";
import { env } from "../../config/env";
import { PaymentService } from "../../services/payment.service";
import { NotificationService } from "../../services/notification.service";
import { formatMoney } from "../keyboards/keyboards";

/**
 * Register report-related handlers.
 * Only accessible by admin and director.
 */
export function registerReportHandlers(bot: Telegraf<BotContext>): void {
  const notificationService = new NotificationService(bot);

  // ─── /report command — daily report ──────────────────────────────
  bot.command("report", async (ctx) => {
    try {
      // Only allow admin and director
      const chatId = ctx.chat.id.toString();
      if (
        chatId !== env.ADMIN_CHAT_ID &&
        chatId !== env.DIRECTOR_CHAT_ID
      ) {
        await ctx.reply("⛔ Bu buyruq faqat administratorlar uchun.");
        return;
      }

      const stats = await PaymentService.getDailyStats();

      const report = [
        `📊 *Bugungi kunlik hisobot*`,
        `📅 Sana: *${formatDate(stats.date)}*`,
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
            `${i + 1}\\. ${escapeMarkdown(p.student.fullName)} — ${formatMoney(p.amount)} so'm`
          );
        });
      } else {
        report.push(``, `📝 Bugun hali to'lov qilinmagan.`);
      }

      await ctx.reply(report.join("\n"), { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Error generating daily report:", error);
      await ctx.reply("❌ Hisobotni yaratishda xatolik yuz berdi.");
    }
  });

  // ─── /monthly command — monthly report ───────────────────────────
  bot.command("monthly", async (ctx) => {
    try {
      // Only allow admin and director
      const chatId = ctx.chat.id.toString();
      if (
        chatId !== env.ADMIN_CHAT_ID &&
        chatId !== env.DIRECTOR_CHAT_ID
      ) {
        await ctx.reply("⛔ Bu buyruq faqat administratorlar uchun.");
        return;
      }

      const stats = await PaymentService.getMonthlyStats();

      const paymentPercentage =
        stats.totalStudents > 0
          ? Math.round((stats.paidCount / stats.totalStudents) * 100)
          : 0;

      const report = [
        `📊 *Oylik hisobot — ${stats.yearMonth}*`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━`,
        `💰 Jami tushumlar: *${formatMoney(stats.totalAmount)} so'm*`,
        `👥 To'lov qilganlar: *${stats.paidCount} ta*`,
        `👥 Jami o'quvchilar: *${stats.totalStudents} ta*`,
        `📈 To'lov foizi: *${paymentPercentage}%*`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n");

      await ctx.reply(report, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Error generating monthly report:", error);
      await ctx.reply("❌ Oylik hisobotni yaratishda xatolik yuz berdi.");
    }
  });

  // ─── /send_report — manually trigger report to director ──────────
  bot.command("send_report", async (ctx) => {
    try {
      const chatId = ctx.chat.id.toString();
      if (chatId !== env.ADMIN_CHAT_ID) {
        await ctx.reply("⛔ Bu buyruq faqat bosh administrator uchun.");
        return;
      }

      await notificationService.sendDailyReport();
      await ctx.reply("✅ Kunlik hisobot direktorga yuborildi.");
    } catch (error) {
      console.error("Error sending report:", error);
      await ctx.reply("❌ Hisobotni yuborishda xatolik yuz berdi.");
    }
  });
}

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

/**
 * Escape Markdown special characters.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
