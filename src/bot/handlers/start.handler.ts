import { Telegraf, Markup } from "telegraf";
import { BotContext, BotState } from "../../types/context";
import { StudentService } from "../../services/student.service";
import { generateInvoice } from "./payment.handler";
import { prisma } from "../../repositories/prisma.repository";
import {
  contactKeyboard,
  courseListKeyboard,
  formatMoney,
  removeKeyboard,
} from "../keyboards/keyboards";

// The hardcoded admin numbers list. 
const ADMIN_NUMBERS = ["998901111111", "998902222222"];

/**
 * Regex to match Uzbek phone numbers in various formats:
 * +998901234567, 998901234567, 901234567
 */
const PHONE_REGEX = /^(\+?998)?(\d{9})$/;

/**
 * Minimal type for what displayStudentInfo actually needs.
 */
interface FlatStudent {
  id: number;
  fullName: string;
  groupName: string | null;
  teacher: string | null;
  classTime: string | null;
  groupBalance: number | null;
  studentBalance: number | null;
}

/**
 * Display student info cards and payment buttons for a given user record.
 */
async function displayStudentInfo(
  ctx: BotContext,
  student: FlatStudent
): Promise<void> {
  if (!student) {
    return;
  }

  // Store session data
  ctx.session.state = BotState.IDENTIFIED;
  ctx.session.userId = student.id; // Map to student.id since user relation is flattened
  ctx.session.studentId = student.id;

  // Fetch the Group to get the exact monthlyFee
  let baseFee = 0;
  if (student.groupName) {
    const group = await prisma.group.findUnique({
      where: { name: student.groupName },
    });
    if (group && group.monthlyFee !== null) {
      baseFee = group.monthlyFee;
    }
  }

  // Get current month based on the backend service
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Dynamically calculate total paid for the current month
  const paymentsThisMonth = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      studentId: student.id,
      status: "PAID",
      paymentMonth: currentMonth
    }
  });

  const totalPaid = paymentsThisMonth._sum.amount || 0;
  
  // Real debt is Course Fee minus Total Paid This Month
  let currentDebt = baseFee - totalPaid;
  if (currentDebt < 0) currentDebt = 0;

  // Build student info card
  const infoLines = [
    `👤 *O'quvchi:* ${student.fullName}`,
    ``,
    `📚 *Fan (Guruh):* ${student.groupName || "Noma'lum"}`,
    `👨‍🏫 *O'qituvchi:* ${student.teacher || "Noma'lum"}`,
    `🕐 *Dars jadvali:* ${student.classTime || "Noma'lum"}`,
    `📉 *Sizning qarzdorligingiz:* ${formatMoney(currentDebt)} so'm`,
    `─────────────────────`,
    ``,
    `To'lov amalga oshirish uchun quyidagi tugmani bosing:`
  ];

  await ctx.reply(infoLines.join("\n"), {
    parse_mode: "Markdown",
    ...removeKeyboard,
  });

  // Directly build the payment button without relying on old enrollment structures
  const buttonText = `💳 ${student.groupName || "To'lov"} — ${formatMoney(currentDebt)} so'm`;
  
  await ctx.reply(
    "💳 *To'lov qilish*",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(buttonText, `pay_${student.id}`)]
      ])
    }
  );
}

/**
 * Register /start command and contact sharing handlers.
 */
export function registerStartHandlers(bot: Telegraf<BotContext>): void {
  // ─── /start command ──────────────────────────────────────────────
  bot.start(async (ctx) => {
    try {
      // Reset session state
      ctx.session.state = BotState.AWAITING_CONTACT;
      ctx.session.studentId = undefined;
      ctx.session.userId = undefined;
      ctx.session.phone = undefined;

      const welcomeMessage = [
        `🎓 *O'quv markazi to'lov tizimiga xush kelibsiz!*`,
        ``,
        `Bot orqali o'quvchining to'lov ma'lumotlarini ko'rish va to'lov amalga oshirish mumkin.`,
        ``,
        `📱 Iltimos, telefon raqamingizni yuboring:`,
      ].join("\n");

      await ctx.reply(welcomeMessage, {
        parse_mode: "Markdown",
        ...contactKeyboard,
      });
    } catch (error) {
      console.error("Error in /start handler:", error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring."
      );
    }
  });

  // ─── Contact shared handler ──────────────────────────────────────
  bot.on("contact", async (ctx) => {
    try {
      const contact = ctx.message.contact;

      // Security: ensure the contact belongs to the sender
      if (contact.user_id !== ctx.from?.id) {
        await ctx.reply(
          "⚠️ Iltimos, faqat o'zingizning telefon raqamingizni yuboring.",
          removeKeyboard
        );
        return;
      }

      const phone = contact.phone_number;
      const normalizedPhone = StudentService.normalizePhone(phone);

      // ONLY the 2 numbers in the array get treated as Admin
      if (ADMIN_NUMBERS.includes(normalizedPhone)) {
        await ctx.reply(
          `👋 *Assalomu alaykum, Administrator!*\n\nSiz botga admin raqami (${normalizedPhone}) orqali kirdingiz.\nO'quvchilarni boshqarish uchun Web Dashboard paneliga kiring.`,
          { parse_mode: "Markdown", ...removeKeyboard }
        );
        return;
      }

      // Upsert user in the database (link Telegram account to this phone)
      const student = await StudentService.upsertUser({
        telegramId: ctx.from.id,
        phone: normalizedPhone,
        firstName: contact.first_name,
        lastName: contact.last_name || undefined,
        username: ctx.from.username,
      });

      // Check if student was found in the database
      if (!student) {
        // ─── FALLBACK: Telegram phone not in DB ──────────────────
        ctx.session.state = BotState.AWAITING_MANUAL_PHONE;
        ctx.session.phone = normalizedPhone;

        await ctx.reply(
          [
            `❌ Kechirasiz, ushbu Telegram raqamingiz tizimdan topilmadi.`,
            `Balki o'quv markaziga boshqa raqam bergandirsiz?`,
            ``,
            `📝 Iltimos, markazda ro'yxatdan o'tgan telefon raqamingizni yozib yuboring`,
            `(Masalan: 998901234567).`,
          ].join("\n"),
          {
            parse_mode: "Markdown",
            ...removeKeyboard,
          }
        );
        return;
      }

      // ─── HAPPY PATH: Student found ────────────────────────────
      ctx.session.phone = normalizedPhone;
      await displayStudentInfo(ctx, student);
    } catch (error) {
      console.error("Error in contact handler:", error);
      await ctx.reply(
        "❌ Ma'lumotlarni yuklashda xatolik yuz berdi. Iltimos, /start buyrug'ini qaytadan yuboring.",
        removeKeyboard
      );
    }
  });

  // ─── Handle text input ───────────────────────────────────────────
  bot.on("text", async (ctx, next) => {
    const input = ctx.message.text.trim();

    // Skip commands (e.g. /start, /help) — let Telegraf route them normally
    if (input.startsWith("/")) {
      return next();
    }

    // -- State: Awaiting payment amount ──────────────────────────────
    if (ctx.session.state === BotState.AWAITING_PAYMENT_AMOUNT) {
      // Remove all non-digit characters from the input (handles spaces, commas, etc)
      const amountStr = input.replace(/\D/g, "");
      const amount = parseInt(amountStr, 10);

      if (isNaN(amount) || amount < 5000) {
        await ctx.reply(
          "⚠️ To'lov summasi noto'g'ri. Iltimos, kamida 5000 so'm kiriting:\n\n(Masalan: 200000)"
        );
        return;
      }

      const studentId = ctx.session.studentId;
      if (!studentId) {
        await ctx.reply("❌ O'quvchi ma'lumotlari topilmadi. Iltimos, /start buyrug'ini bosing.");
        return;
      }

      // Generate the invoice using the user-provided amount
      await generateInvoice(ctx, studentId, amount);

      // Reset state to IDENTIFIED to allow other generic commands but keep student context
      ctx.session.state = BotState.IDENTIFIED;
      return;
    }

    // -- State: Awaiting contact OR manual phone ────────────────────
    if (
      ctx.session.state === BotState.AWAITING_CONTACT ||
      ctx.session.state === BotState.AWAITING_MANUAL_PHONE
    ) {
      // Check if the typed text looks like a phone number
      const match = input.match(PHONE_REGEX);

      if (!match) {
        // Not a phone number — guide the user
        if (ctx.session.state === BotState.AWAITING_CONTACT) {
          await ctx.reply(
            [
              `📱 Iltimos, quyidagi tugma orqali telefon raqamingizni yuboring.`,
              ``,
              `Yoki telefon raqamingizni yozib yuboring:`,
              `(Masalan: 998901234567)`,
            ].join("\n"),
            contactKeyboard
          );
        } else {
          await ctx.reply(
            [
              `⚠️ Telefon raqam formati noto'g'ri.`,
              ``,
              `Iltimos, to'g'ri formatda yuboring:`,
              `998901234567`,
            ].join("\n")
          );
        }
        return;
      }

      // Valid phone number — process it
      await handlePhoneTextInput(ctx, input);
      return;
    }

    // -- Other states: pass to the next handler --------------------
    return next();
  });
}

/**
 * Shared handler for manually typed phone numbers.
 * Used by both AWAITING_CONTACT and AWAITING_MANUAL_PHONE states.
 *
 * @param ctx - Bot context
 * @param input - The raw phone number input from the user
 */
async function handlePhoneTextInput(
  ctx: BotContext,
  input: string
): Promise<void> {
  try {
    // Normalize using the shared helper (removes '+' and spaces)
    const normalizedPhone = StudentService.normalizePhone(input);

    await ctx.reply(`🔍 *${normalizedPhone}* raqami tekshirilmoqda...`, {
      parse_mode: "Markdown",
      ...removeKeyboard,
    });

    // Check if it's an Admin first
    if (ADMIN_NUMBERS.includes(normalizedPhone)) {
      await ctx.reply(
        `👋 *Assalomu alaykum, Administrator!*\n\nSiz botga admin raqami (${normalizedPhone}) orqali kirdingiz.\nO'quvchilarni boshqarish uchun Web Dashboard paneliga kiring.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Query the DATABASE with the normalized phone
    const student = await StudentService.findByPhone(normalizedPhone);

    if (!student) {
      // ─── NOT FOUND: offer retry or contact admin ─────────────
      ctx.session.state = BotState.AWAITING_MANUAL_PHONE;

      await ctx.reply(
        [
          `❌ *Foydalanuvchi topilmadi*`,
          ``,
          `Telefon raqami: ${normalizedPhone}`,
          ``,
          `Bu raqamga bog'langan o'quvchi ma'lumotlari topilmadi.`,
          ``,
          `📝 Boshqa raqamni yozib ko'ring yoki`,
          `📞 o'quv markazi ma'muriyatiga murojaat qiling.`,
          ``,
          `Qaytadan boshlash: /start`,
        ].join("\n"),
        { parse_mode: "Markdown" }
      );
      return;
    }

    // ─── FOUND: show student data ────────────────────────────────
    ctx.session.phone = normalizedPhone;
    await displayStudentInfo(ctx, student);
  } catch (error) {
    console.error("Error in phone text handler:", error);
    await ctx.reply(
      "❌ Raqamni tekshirishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring yoki /start bosing."
    );
  }
}
