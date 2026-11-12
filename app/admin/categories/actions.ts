"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCategory(formData: FormData) {
  const label = formData.get("label") as string;
  if (!label || label.trim() === "") return { error: "Category name is required" };

  const supabase = await createClient();
  const { error } = await supabase.from("Categories").insert({ label: label.trim() });

  if (error) {
    console.error("Add category error:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  return { success: true };
}

export async function deleteCategory(id: number) {
  const supabase = await createClient();
  
  const { error } = await supabase.from("Categories").delete().eq("id", id);

  if (error) {
    console.error("Delete category error:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/categories");
  return { success: true };
}