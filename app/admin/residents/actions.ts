"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function toggleAheStatus(userId: string, newStatus: string) {
  // Security check
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");
  const role = String((session.user as any).role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { aheStatus: newStatus },
    });
    revalidatePath("/admin/residents");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating status:", error);
    return { success: false, error: error.message };
  }
}