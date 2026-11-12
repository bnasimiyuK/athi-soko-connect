"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateHouseNumber(userId: string, phase: string, courtName: string, houseNumber: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { phase, courtName, houseNumber },
    });
    revalidatePath("/admin/house-numbers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}