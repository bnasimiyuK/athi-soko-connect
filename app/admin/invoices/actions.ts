"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return "";
  let p = phone.toString().replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.substring(1);
  return p;
}

export async function generateMonthlyInvoices(targetMonth: string) {
  try {
    const supabase = await createClient();
    
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new Error("Invalid month format.");
    }

    // 1. Delete existing SERVICE invoices for this month to prevent duplicates
    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("billing_month", targetMonth)
      .eq("type", "SERVICE");

    if (deleteError) throw new Error("Failed to clear old invoices: " + deleteError.message);

    // 2. Get unique residents from Prisma
    // FIX: Changed "RESIDENT" to "USER" to match your Role Enum
    const prismaResidents = await prisma.user.findMany({ 
      where: { role: "USER" } 
    });

    // Deduplicate by normalized phone number
    const uniqueResidents = Array.from(new Map(prismaResidents.map(r => [normalizePhone(r.phone), r])).values());

    if (!uniqueResidents.length) throw new Error("No residents found in Prisma.");

    // 3. Get all residents from Supabase
    const { data: supabaseResidents, error: dbError } = await supabase
      .from("Residents")
      .select("id, phone, full_name");

    if (dbError) throw new Error("Supabase Error: " + dbError.message);

    const amount = 2000;
    const dueDate = new Date(`${targetMonth}-05T00:00:00Z`);
    const formattedDueDate = dueDate.toISOString().split('T')[0];

    const invoicesToInsert = [];
    const processedSupabaseIds = new Set(); // Keep track of who we've already billed

    for (const res of uniqueResidents) {
      const normalizedPhone = normalizePhone(res.phone);
      
      const supabaseRes = supabaseResidents?.find(
        sr => normalizePhone(sr.phone) === normalizedPhone
      );
      
      // Only create an invoice if we found a match AND we haven't billed this Supabase user yet
      if (supabaseRes && !processedSupabaseIds.has(supabaseRes.id)) {
        processedSupabaseIds.add(supabaseRes.id);
        
        invoicesToInsert.push({
          resident_id: supabaseRes.id,
          house_number: res.houseNumber || "Unassigned",
          billing_month: targetMonth,
          amount_due: amount,
          amount_paid: 0,
          status: "unpaid",
          due_date: formattedDueDate,
          issued_at: new Date().toISOString(),
          type: "SERVICE"
        });
      }
    }

    if (invoicesToInsert.length === 0) {
      throw new Error("Could not match any Prisma users to Supabase records.");
    }

    // 4. Insert the unique invoices
    const { error } = await supabase.from("invoices").insert(invoicesToInsert);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/invoices");
    return { success: true, count: invoicesToInsert.length };
    
  } catch (error: any) {
    console.error("Invoice generation error:", error.message);
    return { success: false, error: error.message };
  }
}