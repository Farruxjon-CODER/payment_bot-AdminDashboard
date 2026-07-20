import { Markup } from "telegraf";

/**
 * Reply keyboard with a "Share phone number" button.
 * Uses Telegram's request_contact feature for verified phone numbers.
 */
export const contactKeyboard = Markup.keyboard([
  [Markup.button.contactRequest("📱 Telefon raqamni yuborish")],
])
  .oneTime()
  .resize();

/**
 * Inline keyboard with "Make a Payment" button.
 * The callback data includes the enrollment ID for tracking.
 */
export function paymentInlineKeyboard(enrollmentId: number) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("💳 To'lov qilish", `pay_${enrollmentId}`)],
  ]);
}

/**
 * Inline keyboard showing all enrolled courses for a student.
 * Each button triggers payment for that specific enrollment.
 */
export function courseListKeyboard(
  enrollments: Array<{
    id: number;
    course: { name: string; monthlyFee: number };
  }>
) {
  const buttons = enrollments.map((e) => [
    Markup.button.callback(
      `💳 ${e.course.name} — ${formatMoney(e.course.monthlyFee)} so'm`,
      `pay_${e.id}`
    ),
  ]);
  return Markup.inlineKeyboard(buttons);
}

/**
 * Remove keyboard (clear any active reply keyboards).
 */
export const removeKeyboard = Markup.removeKeyboard();

/**
 * Format money amount with thousands separator.
 */
export function formatMoney(amount: number): string {
  return amount.toLocaleString("uz-UZ");
}
