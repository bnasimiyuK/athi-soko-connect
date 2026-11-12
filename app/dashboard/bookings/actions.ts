"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createBooking(data: {
  provider_id: number;
  resident_name: string;
  resident_phone: string;
  service: string;
  job_date: string;
  job_time: string;
  notes: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("Bookings").insert({
    provider_id: data.provider_id,
    resident_name: data.resident_name,
    resident_phone: data.resident_phone,
    service: data.service,
    job_date: data.job_date,
    job_time: data.job_time,
    notes: data.notes,
    status: "requested",
  });

  if (error) {
    console.error("Booking insert error:", error);
    return { success: false, error: error.message };
  }

  // Refresh all relevant pages so the data updates instantly across the app
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/my-bookings");
  revalidatePath("/provider-dashboard");
  revalidatePath("/provider-dashboard/bookings");
  
  return { success: true };
}

// 👇 NEW FUNCTION ADDED HERE 👇
export async function cancelBooking(bookingId: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("Bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) {
    console.error("Cancel error:", error);
    return { success: false, error: error.message };
  }

  // Refresh the views for both the resident and the vendor
  revalidatePath("/dashboard/my-bookings");
  revalidatePath("/provider-dashboard/bookings");
  revalidatePath("/provider-dashboard");
  
  return { success: true };
}