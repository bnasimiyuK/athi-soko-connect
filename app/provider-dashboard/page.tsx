import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma"; // Import Prisma

export default async function ProviderDashboardHome() {
  // 1. Get the user from NextAuth
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  // 2. Fetch the user from Prisma to get their phone number
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser) {
    return <div className="p-8 text-red-500">User not found in database.</div>;
  }

  const supabase = await createClient();
  
  // 3. Find the Provider in Supabase using the PHONE NUMBER (bridging the gap)
  const { data: provider, error: providerError } = await supabase
    .from("Providers")
    .select("id, name")
    .eq("phone", dbUser.phone) // <--- Search by phone instead of auth_id
    .single();

  if (!provider) {
    console.error("Provider fetch error:", providerError);
    return (
      <div className="p-8 text-red-500 bg-red-50 rounded-xl border border-red-200">
        Provider profile not found in Supabase for phone {dbUser.phone}. Please ensure the Providers table has a row for this phone number.
      </div>
    );
  }

  // 4. Fetch their pending bookings
  const { data: bookings } = await supabase
    .from("Bookings")
    .select("*")
    .eq("provider_id", provider.id)
    .eq("status", "requested")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Welcome, {provider.name}</h1>
        <p className="text-gray-500 mt-1">Here is an overview of your service requests.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-500">
          <p className="text-sm font-medium text-gray-500 uppercase">New Requests</p>
          <p className="text-4xl font-bold text-gray-800 mt-2">{bookings?.length || 0}</p>
          <Link href="/provider-dashboard/bookings" className="text-emerald-600 text-sm mt-4 inline-flex items-center gap-1 hover:underline">
            View all bookings <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Latest Requests</h2>
        
        {bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg bg-gray-50">
                <div>
                  <h3 className="font-bold text-gray-800">{booking.service}</h3>
                  <p className="text-sm text-gray-600">{booking.resident_name} • {booking.resident_phone}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                    <Calendar size={14} /> {booking.job_date}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Clock size={14} /> {booking.job_time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            You have no new booking requests.
          </div>
        )}
      </div>
    </div>
  );
}