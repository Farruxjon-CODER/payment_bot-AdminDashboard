"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Create Group ────────────────────────────────────────────────────
export async function createGroup(data: {
  name: string;
  teacher: string;
  startTime: string;
  endTime: string;
  monthlyFee: number;
}) {
  await db.group.create({
    data: {
      name: data.name,
      teacher: data.teacher,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      monthlyFee: data.monthlyFee,
      status: "Active",
    },
  });
  revalidatePath("/courses");
}

// ─── Update Group ────────────────────────────────────────────────────
export async function updateGroup(
  id: number,
  data: {
    monthlyFee: number;
    teacher: string;
    startTime: string;
    endTime: string;
  }
) {
  await db.group.update({
    where: { id },
    data: {
      teacher: data.teacher,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      monthlyFee: data.monthlyFee,
    },
  });
  revalidatePath("/courses");
}
