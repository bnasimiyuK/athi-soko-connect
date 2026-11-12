"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function adminApproveVisitor(groupId: number) {
  const supabase = await createClient();
  await supabase.from("visitor_groups").update({ status: "pending_security" }).eq("id", groupId);
  revalidatePath("/admin/visitors");
}

export async function adminDenyVisitor(groupId: number) {
  const supabase = await createClient();
  await supabase.from("visitor_groups").update({ status: "denied" }).eq("id", groupId);
  revalidatePath("/admin/visitors");
}