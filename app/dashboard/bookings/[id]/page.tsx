import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, FileText } from "lucide-react";
import { createBooking } from "../actions"; // <-- Import your existing action

export default async function BookingFormPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Await params for Next.js 15+ compatibility
  const resolvedParams = await params;
  const providerId = resolvedParams.id;

  // 2. Get the logged-in user via NextAuth
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  // 3. Fetch the resident's profile from Prisma
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!dbUser) redirect("/login");

  const supabase = await createClient();

  // 4. Fetch the specific provider from Supabase
  const { data: provider, error } = await supabase
    .from("Providers")
    .select("id, name, bio, price_from, price_unit, Categories(label)")
    .eq("id", providerId)
    .single();

  if (error || !provider) {
    return <div className="text-red-500 p-8">Provider not found.</div>;
  }

  // Safely extract category label
  const categoryLabel = Array.isArray(provider.Categories) 
    ? provider.Categories[0]?.label 
    : (provider.Categories as any)?.label;

  // 5. Wrapper to use your centralized action
  const submitBooking = async (formData: FormData) => {
    "use server";
    
    // Call your imported function
    const result = await createBooking({
      provider_id: Number(providerId),
      resident_name: dbUser.name || "Resident",
      resident_phone: dbUser.phone || "N/A",
      service: formData.get("service") as string,
      job_date: formData.get("job_date") as string,
      job_time: formData.get("job_time") as string,
      notes: formData.get("notes") as string,
    });

    if (!result.success) {
      throw new Error(`Booking failed: ${result.error}`);
    }

    // Redirect to marketplace on success
    redirect("/dashboard/bookings?success=true");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/bookings" className="text-blue-600 hover:underline flex items-center gap-2 mb-4">
        <ArrowLeft size={16} /> Back to Marketplace
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Provider Header */}
        <div className="bg-slate-900 p-8 text-white">
          <h1 className="text-3xl font-bold">{provider.name}</h1>
          <span className="inline-block bg-slate-800 text-blue-300 text-xs font-bold px-3 py-1 rounded-full mt-2">
            {categoryLabel || "General Service"}
          </span>
          <p className="text-slate-300 mt-4 text-sm max-w-xl">{provider.bio}</p>
          <div className="mt-4 font-medium text-lg">
            KES {provider.price_from || 0} <span className="text-sm text-slate-400 font-normal">{provider.price_unit}</span>
          </div>
        </div>

        {/* Booking Form */}
        <form action={submitBooking} className="p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Schedule Your Service</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" /> Select Date
              </label>
              <input 
                type="date" 
                name="job_date" 
                required
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" /> Preferred Time
              </label>
              <input 
                type="time" 
                name="job_time" 
                required
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText size={16} className="text-blue-500" /> What do you need done?
            </label>
            <input 
              type="text" 
              name="service" 
              required
              placeholder="e.g., Deep clean 2-bedroom apartment"
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
            <textarea 
              name="notes" 
              rows={3}
              placeholder="Any specific instructions for the vendor..."
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            ></textarea>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition"
          >
            Confirm Booking Request
          </button>
        </form>
      </div>
    </div>
  );
}