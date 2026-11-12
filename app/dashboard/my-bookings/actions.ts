"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function submitReview(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Not authenticated");

    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser) throw new Error("User not found");

    const bookingId = Number(formData.get("bookingId"));
    const providerId = Number(formData.get("providerId"));
    const rating = Number(formData.get("rating"));
    const comment = formData.get("comment") as string;

    if (!bookingId || !providerId || !rating) throw new Error("Missing required fields");

    const supabase = await createClient();

    // 1. Insert the Review
    const { error } = await supabase.from("Reviews").insert({
      booking_id: bookingId,
      provider_id: providerId,
      resident_name: dbUser.name || "Resident",
      rating: rating,
      comment: comment,
    });

    if (error) throw new Error(error.message);

    // 2. Mark the booking as reviewed (so the button hides)
    await supabase.from("Bookings").update({ reviewed: true }).eq("id", bookingId);

    revalidatePath("/dashboard/my-bookings");
    return { success: true };
  } catch (error: any) {
    console.error("Review error:", error.message);
    return { success: false, error: error.message };
  }
}