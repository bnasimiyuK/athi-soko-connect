import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { User, Save, CheckCircle, Star } from "lucide-react";

export default async function VendorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const saved = params.saved === "true";

  // 1. Get NextAuth Session
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  // 2. Get Prisma User for the Phone Number
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!dbUser) {
    return <div className="text-red-500 p-8">User not found in Prisma DB.</div>;
  }

  const supabase = await createClient();

  // 3. Fetch Provider from Supabase using Phone Number
  const { data: provider, error } = await supabase
    .from("Providers")
    .select("*") // Removed the Categories join to prevent RLS errors for now
    .eq("phone", dbUser.phone)
    .single();

  if (error || !provider) {
    return <div className="text-red-500 p-8">Provider profile not found in Supabase. (Ensure phone matches: {dbUser.phone})</div>;
  }

  // 4. Server Action to save profile
  const saveProfile = async (formData: FormData) => {
    "use server";
    
    // Re-verify session and Prisma user inside the action
    const actionSession = await getServerSession(authOptions);
    if (!actionSession || !actionSession.user) return;

    const actionDbUser = await prisma.user.findUnique({
      where: { id: actionSession.user.id },
    });
    if (!actionDbUser) return;

    const supabaseServer = await createClient();
    
    const { error: updateError } = await supabaseServer
      .from("Providers")
      .update({
        name: formData.get("name") as string,
        // We do not update the phone here to avoid breaking the Prisma bridge
        hours: formData.get("hours") as string,
        bio: formData.get("bio") as string,
        services: formData.get("services") as string,
        price_from: parseFloat(formData.get("price_from") as string) || 0,
        price_unit: formData.get("price_unit") as string,
        is_available: formData.get("is_available") === "on",
      })
      .eq("phone", actionDbUser.phone); // Update where phone matches Prisma

    if (updateError) {
      console.error("Profile update error:", updateError);
      throw new Error("Failed to update profile");
    }

    revalidatePath("/provider-dashboard/profile");
    redirect("/provider-dashboard/profile?saved=true");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <User size={28} /> My Profile
          </h1>
          <p className="text-gray-500 mt-1">Manage the information residents see about your business.</p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold">
          <Star size={16} fill="currentColor" />
          {provider.rating || "New"}
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} /> Profile updated successfully.
        </div>
      )}

      <form action={saveProfile} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Business Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                name="name"
                defaultValue={provider.name}
                required
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Locked)</label>
              <input
                type="tel"
                name="phone"
                defaultValue={provider.phone}
                readOnly // Locked to prevent breaking the login bridge
                className="w-full border border-gray-200 bg-gray-50 text-gray-500 p-2 rounded-lg cursor-not-allowed"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
              <input
                type="text"
                name="hours"
                defaultValue={provider.hours || ""}
                placeholder="e.g., Mon-Fri: 8am - 6pm"
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Bio</label>
              <textarea
                name="bio"
                defaultValue={provider.bio || ""}
                rows={3}
                className="w-full border border-gray-300 p-2 rounded-lg resize-none"
                placeholder="Tell residents about your business..."
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Services & Pricing</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Services Offered</label>
              <textarea
                name="services"
                defaultValue={provider.services || ""}
                rows={3}
                className="w-full border border-gray-300 p-2 rounded-lg resize-none"
                placeholder="List your services, one per line or comma-separated"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starting Price (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  name="price_from"
                  defaultValue={provider.price_from || 0}
                  required
                  className="w-full border border-gray-300 p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Unit</label>
                <select
                  name="price_unit"
                  defaultValue={provider.price_unit || "per visit"}
                  className="w-full border border-gray-300 p-2 rounded-lg"
                >
                  <option value="per hour">per hour</option>
                  <option value="per visit">per visit</option>
                  <option value="per day">per day</option>
                  <option value="per item">per item</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Availability</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="is_available"
              defaultChecked={provider.is_available}
              className="w-5 h-5 text-emerald-600 rounded"
            />
            <span className="text-sm text-gray-700">
              I am currently accepting new bookings
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
        >
          <Save size={18} /> Save Profile
        </button>
      </form>
    </div>
  );
}