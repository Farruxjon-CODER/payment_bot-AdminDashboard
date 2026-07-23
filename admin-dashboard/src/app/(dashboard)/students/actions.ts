"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateStudentAction(
  originalPhone: string,
  originalFullName: string,
  formData: FormData
) {
  try {
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const courseName = formData.get("courseName") as string;
    const status = formData.get("status") as string;

    // Find the specific student directly by phone
    const student = await db.student.findUnique({
      where: { phone: originalPhone }
    });

    if (!student) {
      return { success: false, message: "O'quvchi topilmadi." };
    }

    // Update Student name/phone if it changed
    if (fullName !== originalFullName || phone !== originalPhone) {
      await db.student.update({
        where: { id: student.id },
        data: { 
          fullName,
          phone
        }
      });
    }

    // Update User phone as well to maintain telegram link if it exists
    if (phone !== originalPhone) {
      await db.user.updateMany({
        where: { phone: originalPhone },
        data: { phone }
      });
    }

    revalidatePath("/students");
    return { success: true, message: "O'quvchi ma'lumotlari yangilandi!" };
    
  } catch (error) {
    console.error("Error in updateStudentAction:", error);
    return { success: false, message: "Server xatosi yuz berdi." };
  }
}
