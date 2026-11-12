"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createVisitorPass(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { error: "Not authenticated" };

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!dbUser) return { error: "User not found" };

    // Generate a random 6-character code (e.g., A1B2C3)
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const visitorName = formData.get("visitorName") as string;
    const visitDate = formData.get("visitDate") as string;
    const expectedTime = formData.get("expectedTime") as string;
    const purpose = formData.get("purpose") as string;

    const supabase = await createClient();
    
    // Insert into your visitor_groups table
    const { error } = await supabase.from("visitor_groups").insert({
      house_number: dbUser.houseNumber || "Unknown",
      visit_date: visitDate,
      expected_time: expectedTime,
      purpose: purpose,
      headcount: 1, // Defaulting to 1 for simplicity
      status: "approved", // Auto-approve since resident is creating it
      access_code: accessCode,
      resident_name: dbUser.name || "Resident", // Adjust if your schema uses resident_id
    });

    if (error) throw error;

    revalidatePath("/dashboard/visitors");
    return { success: true, code: accessCode };
  } catch (error: any) {
    console.error("Visitor pass error:", error);
    return { error: error.message };
  }
}