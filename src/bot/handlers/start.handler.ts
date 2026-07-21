import { Telegraf } from "telegraf";
import { BotContext, BotState } from "../../types/context";
import { StudentService } from "../../services/student.service";
import { ExcelService } from "../../services/excel.service";
import {
  contactKeyboard,
  courseListKeyboard,
  formatMoney,
  removeKeyboard,
} from "../keyboards/keyboards";

// The hardcoded admin numbers list. 
// "998777405717" is deliberately REMOVED so it's treated as a student!
const ADMIN_NUMBERS = ["998901111111", "998902222222"];

/**
 * Regex to match Uzbek phone numbers in various formats:
 * +998901234567, 998901234567, 901234567
 */
const PHONE_REGEX = /^(\+?998)?(\d{9})$/;

/**
 * Minimal type for what displayStudentInfo actually needs.
 */
interface UserWithStudents {
  id: number;
  students: Array<{
    id: number;
    fullName: string;
    enrollments: Array<{
      id: number;
      course: {
        name: string;
        teacherName: string;
        schedule: string;
        monthlyFee: number;
      };
    }>;
  }>;
}

/**
 * Display student info cards and payment buttons for a given user record.
 */
async function displayStudentInfo(
  ctx: BotContext,
  user: UserWithStudents
): Promise<void> {
  if (!user || !user.students || user.students.length === 0) {
    return;
  }

  // Store session data
  ctx.session.state = BotState.IDENTIFIED;
  ctx.session.userId = user.id;

  for (const student of user.students) {
    ctx.session.studentId = student.id;

    if (student.enrollments.length === 0) {
      await ctx.reply(
        `👤 *${student.fullName}* — hech qanday kursga yozilmagan.`,
        {
          parse_mode: "Markdown",
          ...removeKeyboard,
        }
      );
      continue;
    }

    // Build student info card
    const infoLines = [
      `👤 *O'quvchi:* ${student.fullName}`,
      ``,
    ];

    for (const enrollment of student.enrollments) {
      const course = enrollment.course;
      infoLines.push(
        `📚 *Fan:* ${course.name}`,
        `👨‍🏫 *O'qituvchi:* ${course.teacherName}`,
        `🕐 *Dars jadvali:* ${course.schedule}`,
        `💰 *Oylik to'lov:* ${formatMoney(course.monthlyFee)} so'm`,
        `─────────────────────`
      );
    }

    infoLines.push(
      ``,
      `To'lov amalga oshirish uchun quyidagi tugmani bosing:`
    );

    await ctx.reply(infoLines.join("\n"), {
      parse_mode: "Markdown",
      ...removeKeyboard,
    });

    // Show payment buttons for each enrollment
    await ctx.reply(
      "💳 *Qaysi fan uchun to'lov qilmoqchisiz?*",
      {
        parse_mode: "Markdown",
        ...courseListKeyboard(student.enrollments),
      }
    );
  }
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

      // Check if Admin
      if (ADMIN_NUMBERS.includes(normalizedPhone)) {
        await ctx.reply(
          `👋 *Assalomu alaykum, Administrator!*\n\nSiz botga admin raqami (${normalizedPhone}) orqali kirdingiz.\nO'quvchilarni boshqarish uchun Web Dashboard paneliga kiring.`,
          { parse_mode: "Markdown", ...removeKeyboard }
        );
        return;
      }

      // Check if user has any students registered in Excel
      const user = ExcelService.findByPhone(normalizedPhone);

      if (!user || !user.students || user.students.length === 0) {
        // ─── FALLBACK: Telegram phone not in DB/Excel ────────────
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
      await displayStudentInfo(ctx, user);
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

    // Query the EXCEL FILE with the normalized phone
    const user = ExcelService.findByPhone(normalizedPhone);

    if (!user || !user.students || user.students.length === 0) {
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
    await displayStudentInfo(ctx, user);
  } catch (error) {
    console.error("Error in phone text handler:", error);
    await ctx.reply(
      "❌ Raqamni tekshirishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring yoki /start bosing."
    );
  }
}
