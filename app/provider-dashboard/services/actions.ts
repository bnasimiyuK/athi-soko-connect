"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return "";
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.substring(1);
  return p;
}

async function getProviderId() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser || !dbUser.phone) throw new Error("User not found");

  const supabase = await createClient();
  const { data: providers } = await supabase.from("Providers").select("id, phone");
  const provider = providers?.find(p => normalizePhone(p.phone) === normalizePhone(dbUser.phone));

  if (!provider) throw new Error("Provider profile not found");
  return { supabase, providerId: provider.id };
}

export async function addOffering(formData: FormData) {
  try {
    const { supabase, providerId } = await getProviderId();
    
    const services = formData.get("title") as string;
    const price_from = parseFloat(formData.get("price") as string);
    const price_unit = formData.get("price_unit") as string;
    const category_id = parseInt(formData.get("category_id") as string); 
    
    // New fields
    const location = formData.get("location") as string;
    const phase = formData.get("phase") as string;
    const court = formData.get("court") as string;
    const is_available = formData.get("is_available") === "on";

    if (!services || !price_from || !category_id) throw new Error("Title, price, and category are required");

    const { error } = await supabase.from("ProviderOfferings").insert({
      provider_id: providerId,
      services: services,
      price_from: price_from,
      price_unit: price_unit || "per hour",
      category_id: category_id,
      location: location,
      phase: phase,
      court: court,
      is_available: is_available
    });

    if (error) throw new Error(error.message);

    revalidatePath("/provider-dashboard/services");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteOffering(id: number) {
  try {
    const { supabase } = await getProviderId();
    await supabase.from("ProviderOfferings").delete().eq("id", id);
    revalidatePath("/provider-dashboard/services");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}