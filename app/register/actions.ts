"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";

export async function registerResident(data: {
  name: string;
  phone: string;
  password: string;
  phase: string;
  courtName: string;
  houseNumber: string;
  ahewaOptIn: boolean;
  mpesaCode: string;
}) {
  if (!data.name || !data.phone || !data.password || !data.phase || !data.courtName || !data.houseNumber) {
    return { error: "All fields are required." };
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existingUser) return { error: "A user with this phone number already exists." };

    const hashedPassword = await bcrypt.hash(data.password, 10);

    await prisma.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        password: hashedPassword,
        role: "RESIDENT",
        phase: `Phase ${data.phase}`, // Saves as "Phase 1" for a nicer display later
        courtName: String(data.courtName),
        houseNumber: String(data.houseNumber),
        ahewaOptIn: Boolean(data.ahewaOptIn),
        mpesaCode: String(data.mpesaCode),
        aheStatus: "PENDING", 
      },
    });

    return { success: true };
  } catch (error: any) {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function getCourtsByPhase(phase: string) {
  const supabase = await createClient();
  
  // Convert the string "1" or "2" into an integer for Supabase
  const phaseNumber = parseInt(phase, 10);

  const { data, error } = await supabase
    .from("Courts")
    .select("name")
    .eq("phase", phaseNumber) 
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching courts:", error);
    return { error: error.message };
  }

  return { data: data.map((c) => c.name) };
}
export async function getHousesByCourt(courtName: string) {
  if (!courtName) return { data: [] };

  try {
    // Generate the naming convention: Court-A01 to Court-B15
    const blocks = ["A", "B"];
    const numbers = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, "0"));
    
    const houses: string[] = [];
    blocks.forEach(block => {
      numbers.forEach(num => {
        houses.push(`${courtName}-${block}${num}`);
      });
    });

    // Return the generated list
    return { data: houses };
  } catch (error: any) {
    return { error: "Failed to generate houses." };
  }
}