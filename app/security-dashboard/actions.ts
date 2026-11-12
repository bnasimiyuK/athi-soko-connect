"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function securityApproveAndGenerate(groupId: number) {
  const supabase = await createClient();
  
  // Generate Code
  const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Set expiry to 24 hours from now
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await supabase.from("visitor_groups").update({ 
    status: "approved",
    access_code: accessCode,
    expires_at: expiresAt.toISOString()
  }).eq("id", groupId);
  
  revalidatePath("/security-dashboard");
}

export async function updateVisitStatus(groupId: number, newStatus: string) {
  const supabase = await createClient();
  await supabase.from("visitor_groups").update({ status: newStatus }).eq("id", groupId);
  revalidatePath("/security-dashboard");
}