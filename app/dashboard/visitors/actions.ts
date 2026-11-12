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

export async function createVisitorPass(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Not authenticated");

    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser || !dbUser.phone) throw new Error("User not found in Prisma");

    const visitorName = formData.get("visitorName") as string;
    const visitorPhone = formData.get("visitorPhone") as string;
    const purpose = formData.get("purpose") as string;
    const visitDate = formData.get("visitDate") as string;
    const expectedTime = formData.get("expectedTime") as string;
    
    const hasVehicle = formData.get("hasVehicle") === "on";
    const vehicleType = formData.get("vehicleType") as string;
    const plateNumber = formData.get("plateNumber") as string;

    const supabase = await createClient();

    // 1. Find the resident in Supabase
    const normalizedPrismaPhone = normalizePhone(dbUser.phone);
    const { data: allResidents } = await supabase.from("Residents").select("id, full_name, house_number, phone");
    
    // Explicitly type as any to avoid TypeScript reassignment errors
    let resident: any = allResidents?.find(r => normalizePhone(r.phone) === normalizedPrismaPhone);

    // 1b. Auto-create Resident record if they don't exist (e.g., logged in as Vendor)
    if (!resident) {
      console.log(`Auto-creating Resident record for ${dbUser.name || "Vendor"}...`);
      const { data: newResident, error: createError } = await supabase
        .from("Residents")
        .insert({
          phone: dbUser.phone,
          full_name: dbUser.name || "Vendor Resident",
          house_number: dbUser.houseNumber || "Unassigned"
        })
        .select()
        .single();
      
      if (createError) {
        console.error("Auto-create error:", createError);
        throw new Error("Failed to auto-create resident profile: " + createError.message);
      }
      resident = newResident;
    }

    // 2. Create the Visitor Group (Status: pending_admin)
    const { data: group, error: groupError } = await supabase
      .from("visitor_groups")
      .insert({
        resident_id: resident.id,
        house_number: resident.house_number || "Unassigned",
        visit_date: visitDate,
        expected_time: expectedTime,
        purpose: purpose,
        headcount: 1, 
        status: "pending_admin", 
        access_code: null, 
      })
      .select()
      .single();

    if (groupError) {
      console.error("Group insert error:", groupError);
      throw new Error("Failed to create group: " + groupError.message);
    }

    // 3. Create the Visitor Record
    const { error: visitorError } = await supabase.from("visitors").insert({
      group_id: group.id,
      name: visitorName,
      phone: visitorPhone,
    });

    if (visitorError) {
      console.error("Visitor insert error:", visitorError);
      throw new Error("Failed to create visitor: " + visitorError.message);
    }

    // 4. Create the Vehicle Record
    if (hasVehicle && plateNumber) {
      await supabase.from("visitor_vehicles").insert({
        visitor_group_id: group.id,
        vehicle_type: vehicleType || "Car",
        plate_number: plateNumber,
        driver_name: visitorName,
      });
    }

    revalidatePath("/dashboard/visitors");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating pass:", error.message);
    return { success: false, error: error.message };
  }
}