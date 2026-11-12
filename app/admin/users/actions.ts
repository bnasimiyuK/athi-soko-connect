"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/client"; // Import the Role enum

export async function updateUserRole(userId: string, newRole: string) {
  try {
    // 🚨 ENFORCE BUSINESS RULE: All vendors must first be residents
    if (newRole.toUpperCase() === "VENDOR") {
      const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { houseNumber: true, name: true }
      });
      
      if (!user || !user.houseNumber) {
        return { 
          success: false, 
          error: `Cannot assign Vendor role to ${user?.name || "this user"}. They must have a House Number assigned first. Go to "House Numbers" to assign one.` 
        };
      }
    }

    // Proceed with role update
    await prisma.user.update({
      where: { id: userId },
      // Cast the string to the Role enum, and force uppercase for safety
      data: { role: newRole.toUpperCase() as Role }, 
    });
    
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating role:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId: string) {
  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
}