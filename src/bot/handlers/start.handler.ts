import { Telegraf } from "telegraf";
import { BotContext, BotState } from "../../types/context";
import { StudentService } from "../../services/student.service";
import {
  contactKeyboard,
  courseListKeyboard,
  formatMoney,
  removeKeyboard,
} from "../keyboards/keyboards";

/**
 * Regex to match Uzbek phone numbers in various formats:
 * +998901234567, 998901234567, 901234567
 */
const PHONE_REGEX = /^(\+?998)?(\d{9})$/;

/**
 * Minimal type for what displayStudentInfo actually needs.
 * Works with both StudentService.findByPhone and StudentService.upsertUser results.
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
 * Extracted as a reusable helper to avoid duplication between
 * the contact handler (happy path) and the manual phone fallback.
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

      // Upsert user in the database (link Telegram account to this phone)
      const user = await StudentService.upsertUser({
        telegramId: ctx.from.id,
        phone,
        firstName: contact.first_name,
        lastName: contact.last_name || undefined,
        username: ctx.from.username,
      });

      // Check if user has any students registered
      if (!user.students || user.students.length === 0) {
        // ─── FALLBACK: Telegram phone not in DB ──────────────────
        ctx.session.state = BotState.AWAITING_MANUAL_PHONE;
        ctx.session.phone = StudentService.normalizePhone(phone);

        await ctx.reply(
          [
            `❌ Kechirasiz, ushbu Telegram raqamingiz tizimdan topilmadi.`,
            `Balki o'quv markaziga boshqa raqam bergandirsiz?`,
            ``,
            `📝 Iltimos, markazda ro'yxatdan o'tgan telefon raqamingizni yozib yuboring`,
            `(Masalan: +998901234567 yoki 998901234567).`,
          ].join("\n"),
          {
            parse_mode: "Markdown",
            ...removeKeyboard,
          }
        );
        return;
      }

      // ─── HAPPY PATH: Student found ────────────────────────────
      ctx.session.phone = StudentService.normalizePhone(phone);
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
              `(Masalan: +998901234567 yoki 998901234567)`,
            ].join("\n"),
            contactKeyboard
          );
        } else {
          await ctx.reply(
            [
              `⚠️ Telefon raqam formati noto'g'ri.`,
              ``,
              `Iltimos, to'g'ri formatda yuboring:`,
              `+998901234567 yoki 998901234567`,
            ].join("\n")
          );
        }
        return;
      }

      // Valid phone number — process it
      await handlePhoneTextInput(ctx, match);
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
 * @param match - Regex match from PHONE_REGEX [full, prefix, 9digits]
 */
async function handlePhoneTextInput(
  ctx: BotContext,
  match: RegExpMatchArray
): Promise<void> {
  try {
    // Normalize: extract the 9-digit part and prepend +998
    const nineDigits = match[2];
    const normalizedPhone = `+998${nineDigits}`;

    await ctx.reply(`🔍 *${normalizedPhone}* raqami tekshirilmoqda...`, {
      parse_mode: "Markdown",
      ...removeKeyboard,
    });

    // Query the database with the manually entered phone
    const user = await StudentService.findByPhone(normalizedPhone);

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
