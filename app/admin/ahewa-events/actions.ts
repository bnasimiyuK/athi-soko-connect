"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createAhewaEvent(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Not authenticated");

    const role = String((session.user as any).role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Unauthorized");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const eventDate = formData.get("eventDate") as string;
    const eventType = formData.get("eventType") as string; 
    const affectedMemberId = parseInt(formData.get("affectedMemberId") as string);

    if (!affectedMemberId) throw new Error("Please select the affected member");

    // Determine amount based on rules: PRINCIPAL = 1200, DEPENDANT = 700
    const contributionAmount = eventType === "PRINCIPAL" ? 1200 : 700;

    const supabase = await createClient();

    // 1. Create the Event
    const { data: event, error: eventError } = await supabase
      .from("AhewaEvents")
      .insert({
        event_title: title,
        description: description,
        event_date: eventDate,
        event_type: eventType,
        affected_member_id: affectedMemberId,
        contribution_amount: contributionAmount,
        is_closed: false,
        is_disbursed: false,
      })
      .select()
      .single();

    if (eventError) throw new Error("Failed to create event: " + eventError.message);

    // 2. Fetch all active AHEWA Members
    const { data: members, error: membersError } = await supabase
      .from("AhewaMembership")
      .select("resident_id");

    if (membersError) throw new Error("Failed to fetch members");

    // 3. Auto-bill all members EXCEPT the affected member
    if (members && members.length > 0) {
      const billsToInsert = members
        .filter(m => m.resident_id !== affectedMemberId) // Exemption logic
        .map((member) => ({
          resident_id: member.resident_id,
          event_id: event.id,
          amount_due: contributionAmount,
          amount_paid: 0,
          status: "unpaid",
        }));

      if (billsToInsert.length > 0) {
        const { error: billsError } = await supabase.from("AhewaContributions").insert(billsToInsert);
        if (billsError) throw new Error("Event created, but billing failed: " + billsError.message);
      }
    }

    revalidatePath("/admin/ahewa-events");
    revalidatePath("/admin/ahewa-contributions");
    revalidatePath("/dashboard/ahewa");
    
    return { success: true, count: members?.length ? members.length - 1 : 0 };
  } catch (error: any) {
    console.error("Create Event Error:", error.message);
    return { success: false, error: error.message };
  }
}