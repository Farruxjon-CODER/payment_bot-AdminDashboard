"use server";

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(
  prevState: { error: string | null },
  formData: FormData
) {
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!phone || !password) {
    return { error: "Iltimos, telefon raqam va parolni kiriting." };
  }

  // Find admin in the database
  const admin = await db.admin.findUnique({
    where: { phone },
  });

  // Verify password (plain text as requested in previous requirements)
  if (!admin || admin.password !== password) {
    return { error: "Telefon raqam yoki parol noto'g'ri." };
  }

  // Create an HTTP-Only, Secure cookie
  const cookieStore = await cookies();
  cookieStore.set("admin_session", admin.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  // Redirect to dashboard
  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  redirect("/login");
}
