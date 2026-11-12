"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const REQUIRED_APPROVALS = 3;

// ---------------------------------------------------------------------------
// 1. M-Pesa STK push for AHEWA contributions
// ---------------------------------------------------------------------------
export async function triggerAhewaPayment(
  amount: number,
  eventId: number | null,
  reference: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Not authenticated");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.phone) throw new Error("User phone not found");

    const supabase = await createClient();

    // 1. Find the resident's integer ID from the Supabase Residents table
    const { data: resident } = await supabase
      .from("Residents")
      .select("id")
      .eq("phone", user.phone)
      .single();

    if (!resident) throw new Error("Resident profile not found in database");

    // 2. Insert a PENDING contribution record
    const { data: contribution, error: dbError } = await supabase
      .from("AhewaContributions")
      .insert({
        resident_id: resident.id,
        event_id: eventId, // null for general contribution
        amount_due: amount,
        amount_paid: 0,
        status: "PENDING",
      })
      .select()
      .single();

    if (dbError) throw new Error("Failed to save contribution: " + dbError.message);

    // 3. Trigger M-Pesa STK Push
    let phoneNumber = user.phone.trim();
    if (phoneNumber.startsWith("0")) phoneNumber = "254" + phoneNumber.substring(1);
    if (phoneNumber.startsWith("+")) phoneNumber = phoneNumber.substring(1);

    const consumerKey = process.env.DARAJA_CONSUMER_KEY;
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
    const shortcode = process.env.DARAJA_SHORTCODE;
    const passkey = process.env.DARAJA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
      await supabase.from("AhewaContributions").delete().eq("id", contribution.id);
      throw new Error("Missing Daraja credentials in .env.local");
    }

    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      await supabase.from("AhewaContributions").delete().eq("id", contribution.id);
      throw new Error("Could not get an M-Pesa access token");
    }

    const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkResponse = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: shortcode,
          PhoneNumber: phoneNumber,
          CallBackURL: callbackUrl,
          AccountReference: reference,
          TransactionDesc: "AHEWA Contribution",
        }),
      }
    );

    const stkData = await stkResponse.json();

    if (stkData.ResponseCode !== "0") {
      await supabase.from("AhewaContributions").delete().eq("id", contribution.id);
      throw new Error(stkData.errorMessage || "Safaricom rejected the request");
    }

    revalidatePath("/dashboard/ahewa");
    if (eventId) revalidatePath(`/dashboard/ahewa/${eventId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error("AHEWA ERROR:", error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 2. Signatory co-authorization of a disbursement (3 approvals required)
// ---------------------------------------------------------------------------
export async function approveDisbursement(eventId: number, signatoryId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Not authenticated");

    const supabase = await createClient();

    // 0. Don't allow approvals on an event that is already disbursed
    const { data: event, error: eventError } = await supabase
      .from("AhewaEvents")
      .select("id, is_disbursed")
      .eq("id", eventId)
      .single();

    if (eventError || !event) throw new Error("Event not found");
    if (event.is_disbursed) throw new Error("This event has already been disbursed");

    // 1. Stop the same signatory approving twice
    const { data: existing } = await supabase
      .from("AhewaDisbursementApprovals")
      .select("id")
      .eq("event_id", eventId)
      .eq("signatory_id", signatoryId)
      .maybeSingle();

    if (existing) throw new Error("You have already approved this disbursement");

    // 2. Record the approval
    const { error: insertError } = await supabase
      .from("AhewaDisbursementApprovals")
      .insert({
        event_id: eventId,
        signatory_id: signatoryId,
        notes: "Approved via dashboard",
        approved_at: new Date().toISOString(),
      });

    if (insertError) throw new Error(insertError.message);

    // 3. Count approvals from distinct signatories
    const { data: approvals, error: countError } = await supabase
      .from("AhewaDisbursementApprovals")
      .select("signatory_id")
      .eq("event_id", eventId);

    if (countError) throw new Error(countError.message);

    const approvalCount = new Set((approvals ?? []).map((a) => a.signatory_id)).size;

    // 4. If enough approvals, mark the event as disbursed
    let disbursed = false;
    if (approvalCount >= REQUIRED_APPROVALS) {
      const { error: updateError } = await supabase
        .from("AhewaEvents")
        .update({ is_disbursed: true, disbursed_at: new Date().toISOString() })
        .eq("id", eventId);

      if (updateError) throw new Error(updateError.message);
      disbursed = true;
    }

    revalidatePath(`/dashboard/ahewa/${eventId}`);
    revalidatePath("/dashboard/ahewa");

    return {
      success: true,
      approvals: approvalCount,
      required: REQUIRED_APPROVALS,
      disbursed,
    };
  } catch (error: any) {
    console.error("APPROVE DISBURSEMENT ERROR:", error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 3. Admin action to close an event
// ---------------------------------------------------------------------------
export async function closeAhewaEvent(eventId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Not authenticated");

    const role = String((session.user as any).role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      throw new Error("Only administrators can close events.");
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("AhewaEvents")
      .update({
        is_closed: true,
        is_disbursed: true,
        disbursed_at: new Date().toISOString(),
        disbursed_notes: "Event closed and funds disbursed by Admin."
      })
      .eq("id", eventId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/ahewa");
    revalidatePath(`/dashboard/ahewa/${eventId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error("Close Event Error:", error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// 4. Admin action to create event and auto-bill members
// ---------------------------------------------------------------------------
export async function createAhewaEvent(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Not authenticated");

    const role = String((session.user as any).role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Unauthorized");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const eventDate = formData.get("eventDate") as string;
    const beneficiaryType = formData.get("beneficiaryType") as string; 
    const affectedMemberId = parseInt(formData.get("affectedMemberId") as string);

    if (!affectedMemberId) throw new Error("Please select the affected member");

    // Determine amount: 1200 for PRINCIPAL, 700 for DEPENDANT
    const contributionAmount = beneficiaryType === "PRINCIPAL" ? 1200 : 700;

    const supabase = await createClient();

    // 1. Create the Event
    const { data: event, error: eventError } = await supabase
      .from("AhewaEvents")
      .insert({
        event_title: title,
        description: description,
        event_date: eventDate,
        beneficiary_type: beneficiaryType,
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
        await supabase.from("AhewaContributions").insert(billsToInsert);
      }
    }

    revalidatePath("/admin/ahewa-events");
    revalidatePath("/dashboard/ahewa");
    return { success: true };
  } catch (error: any) {
    console.error("Create Event Error:", error.message);
    return { success: false, error: error.message };
  }
}