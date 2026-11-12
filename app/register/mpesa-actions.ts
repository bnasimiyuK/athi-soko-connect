"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function initiateMpesaPayment(data: {
  name: string;
  phone: string;
  password: string;
  phase: string;
  courtName: string;
  houseNumber: string;
  ahewaOptIn: boolean;
}, amount: number) {
  try {
    let phoneNumber = data.phone.trim();
    if (phoneNumber.startsWith("0")) phoneNumber = "254" + phoneNumber.substring(1);
    if (phoneNumber.startsWith("+")) phoneNumber = phoneNumber.substring(1);

    const hashedPassword = await bcrypt.hash(data.password, 10);

    await prisma.pendingRegistration.upsert({
      where: { phone: data.phone },
      update: { ...data, password: hashedPassword },
      create: { ...data, password: hashedPassword },
    });

    // Check for missing variables
    const consumerKey = process.env.DARAJA_CONSUMER_KEY;
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
    const shortcode = process.env.DARAJA_SHORTCODE;
    const passkey = process.env.DARAJA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
      console.error("MISSING ENV VARS:", { consumerKey, consumerSecret, shortcode, passkey, callbackUrl });
      throw new Error("Missing Daraja credentials in .env.local");
    }

    // Fixed: Using btoa instead of Buffer
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    if (!tokenResponse.ok) {
       const errText = await tokenResponse.text();
       throw new Error(`Failed to get token: ${errText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14);
    
    // Fixed: Using btoa instead of Buffer
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
        AccountReference: "AHE-Registration",
        TransactionDesc: "AHE Fee"
      }),
    });

    const stkData = await stkResponse.json();
    
    if (stkData.ResponseCode !== "0") {
      throw new Error(stkData.errorMessage || "Safaricom rejected the request");
    }

    return { success: true };

  } catch (error: any) {
    console.error("🚨 MPESA ERROR DETAILS:", error.message);
    return { success: false, error: error.message };
  }
}