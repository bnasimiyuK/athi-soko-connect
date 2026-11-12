"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleVendorVerification(vendorId: number, currentStatus: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("Providers")
    .update({ verified: !currentStatus })
    .eq("id", vendorId);

  if (error) {
    console.error("Verification toggle error:", error);
    return { success: false, error: error.message };
  }

  // Refresh the admin vendors page and the resident marketplace
  revalidatePath("/admin/vendors");
  revalidatePath("/dashboard/bookings");
  
  return { success: true };
}