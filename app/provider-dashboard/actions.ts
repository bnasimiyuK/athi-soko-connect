"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateBookingStatus(bookingId: number, newStatus: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("Bookings")
    .update({ status: newStatus })
    .eq("id", bookingId);

  if (error) {
    console.error("Supabase update error:", error);
    return { success: false, error: error.message };
  }

  // Revalidate the pages so the data updates instantly
  revalidatePath("/provider-dashboard/bookings");
  revalidatePath("/provider-dashboard");
  
  return { success: true };
}