"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Create Course ────────────────────────────────────────────────────
export async function createCourse(data: {
  name: string;
  teacherName: string;
  schedule: string;
  monthlyFee: number;
}) {
  await db.course.create({
    data: {
      name: data.name,
      teacherName: data.teacherName,
      schedule: data.schedule,
      monthlyFee: data.monthlyFee,
    },
  });
  revalidatePath("/courses");
}

// ─── Update Course ────────────────────────────────────────────────────
export async function updateCourse(
  id: number,
  data: {
    name: string;
    teacherName: string;
    schedule: string;
    monthlyFee: number;
  }
) {
  await db.course.update({
    where: { id },
    data: {
      name: data.name,
      teacherName: data.teacherName,
      schedule: data.schedule,
      monthlyFee: data.monthlyFee,
    },
  });
  revalidatePath("/courses");
}
