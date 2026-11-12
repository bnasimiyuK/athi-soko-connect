"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function uploadEventPhoto(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Not authenticated");

    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser) throw new Error("User not found");

    const eventId = Number(formData.get("eventId"));
    const caption = formData.get("caption") as string;
    const file = formData.get("file") as File;

    if (!file || file.size === 0) throw new Error("No file provided");
    if (!eventId) throw new Error("No event ID provided");

    const fileExt = file.name.split(".").pop();
    const fileName = `event-${eventId}-${Date.now()}.${fileExt}`;
    const filePath = `events/${fileName}`; 

    const supabase = await createClient();

    // ⚠️ Update "ahewa-photos" to your actual bucket name
    const { error: uploadError } = await supabase.storage
      .from("ahewa-photos") 
      .upload(filePath, file);

    if (uploadError) throw new Error("Upload failed: " + uploadError.message);

    const { error: dbError } = await supabase
      .from("AhewaEventPhotos")
      .insert({
        event_id: eventId,
        file_path: filePath,
        original_name: file.name,
        caption: caption,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: dbUser.phone,
        is_deleted: false,
      });

    if (dbError) throw new Error("Database error: " + dbError.message);

    revalidatePath("/dashboard/ahewa");
    return { success: true };
  } catch (error: any) {
    console.error("Photo upload error:", error.message);
    return { success: false, error: error.message };
  }
}