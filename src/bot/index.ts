import { Telegraf } from "telegraf";
import { BotContext } from "../types/context";
import { sessionMiddleware } from "./middlewares/session.middleware";
import { registerStartHandlers } from "./handlers/start.handler";
import { registerPaymentHandlers } from "./handlers/payment.handler";
import { registerReportHandlers } from "./handlers/report.handler";

/**
 * Create and configure the Telegraf bot instance.
 * Registers all middlewares and handlers in the correct order.
 */
export function createBot(token: string): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(token);

  // ─── Global error handler ───────────────────────────────────────
  bot.catch((error, ctx) => {
    console.error(`❌ Bot error for ${ctx.updateType}:`, error);
    try {
      ctx.reply(
        "❌ Kutilmagan xatolik yuz berdi. Iltimos, /start buyrug'ini qaytadan yuboring."
      );
    } catch {
      // Cannot reply — ignore
    }
  });

  // ─── Middlewares ─────────────────────────────────────────────────
  bot.use(sessionMiddleware());

  // ─── Register all handlers ──────────────────────────────────────
  registerStartHandlers(bot);
  registerPaymentHandlers(bot);
  registerReportHandlers(bot);

  // ─── /help command ──────────────────────────────────────────────
  bot.help(async (ctx) => {
    const helpText = [
      `🤖 *Bot buyruqlari:*`,
      ``,
      `/start — Botni ishga tushirish va ro'yxatdan o'tish`,
      `/help — Yordam`,
      ``,
      `📌 *Qanday ishlaydi:*`,
      `1️⃣ /start buyrug'ini yuboring`,
      `2️⃣ Telefon raqamingizni ulashing`,
      `3️⃣ O'quvchi ma'lumotlarini ko'ring`,
      `4️⃣ "To'lov qilish" tugmasini bosing`,
      `5️⃣ To'lovni amalga oshiring`,
      ``,
      `Savollar bo'lsa, o'quv markazi ma'muriyatiga murojaat qiling.`,
    ].join("\n");

    await ctx.reply(helpText, { parse_mode: "Markdown" });
  });

  return bot;
}
