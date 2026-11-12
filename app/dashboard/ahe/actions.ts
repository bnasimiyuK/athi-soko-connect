"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function triggerAhePayment(amount: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Not authenticated");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.phone) throw new Error("User phone not found");

    let phoneNumber = user.phone.trim();
    if (phoneNumber.startsWith("0")) phoneNumber = "254" + phoneNumber.substring(1);
    if (phoneNumber.startsWith("+")) phoneNumber = phoneNumber.substring(1);

    const consumerKey = process.env.DARAJA_CONSUMER_KEY;
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
    const shortcode = process.env.DARAJA_SHORTCODE;
    const passkey = process.env.DARAJA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
      throw new Error("Missing Daraja credentials in .env.local");
    }

    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkResponse = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
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
        AccountReference: "AHE-Payment",
        TransactionDesc: "AHE Bill Payment"
      }),
    });

    const stkData = await stkResponse.json();
    
    if (stkData.ResponseCode !== "0") {
      throw new Error(stkData.errorMessage || "Safaricom rejected the request");
    }

    return { success: true };
  } catch (error: any) {
    console.error("MPESA ERROR:", error.message);
    return { success: false, error: error.message };
  }
}