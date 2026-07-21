"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateAdminCredentials(data: {
  id: number;
  phone: string;
  password: string;
}) {
  // Strict Validation: Numeric, max 8 digits
  const passwordRegex = /^\d{1,8}$/;
  if (!passwordRegex.test(data.password)) {
    return {
      success: false,
      error: "Parol faqat raqamlardan iborat va maksimal 8 ta belgi bo'lishi kerak.",
    };
  }

  try {
    await db.admin.update({
      where: { id: data.id },
      data: {
        phone: data.phone,
        password: data.password,
      },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Failed to update admin:", error);
    return { success: false, error: "Tizim xatoligi yuz berdi." };
  }
}
