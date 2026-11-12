"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePaymentStatus(paymentId: number, status: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("Payments").update({ status }).eq("id", paymentId);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/payments");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}