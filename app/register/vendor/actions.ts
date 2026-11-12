"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function registerVendor(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const businessName = formData.get("businessName") as string;
  const services = formData.get("services") as string;
  const priceFrom = parseFloat(formData.get("priceFrom") as string) || 0;
  const priceUnit = formData.get("priceUnit") as string;

  if (!name || !phone || !password || !businessName) return { error: "Required fields are missing." };

  try {
    // 1. Check if phone exists in Prisma
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) return { error: "A user with this phone number already exists." };

    // 2. Create Prisma User (for Login)
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, phone, password: hashedPassword, role: "VENDOR" },
    });

    // 3. Create Supabase Provider Profile (for Marketplace)
    const supabase = await createClient();
    const { error: supabaseError } = await supabase.from("Providers").insert({
      name: businessName,
      phone: phone, // Saving phone here so residents can see it after booking
      services: services,
      price_from: priceFrom,
      price_unit: priceUnit,
      verified: false, // New vendors start unverified! Admin must approve them.
      rating: 0,
      reviews: 0,
    });

    if (supabaseError) {
      console.error("Supabase insert error:", supabaseError);
      return { error: "Failed to create business profile." };
    }

    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: "Something went wrong. Please try again." };
  }
}