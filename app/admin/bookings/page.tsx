import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import BookingTable from "./BookingTable";

export default async function AdminBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const role = String((session.user as any).role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/login");

  const supabase = await createClient();

  // 1. Fetch Bookings
  const { data: bookings, error } = await supabase
    .from("Bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error loading bookings: {error.message}</div>;
  }

  // 2. Fetch Providers to map provider_id to name
  const { data: providers } = await supabase.from("Providers").select("id, name");

  // 3. Join the data
  const mappedBookings = (bookings || []).map((b: any) => ({
    ...b,
    provider_name: providers?.find((p) => p.id === b.provider_id)?.name || `Vendor #${b.provider_id}`,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarCheck className="text-purple-600" size={32} /> All System Bookings
        </h1>
        <p className="text-gray-500 mt-1">A comprehensive list of all service requests across the estate.</p>
      </div>

      {/* Pass the joined data to the table */}
      <BookingTable bookings={mappedBookings} />
    </div>
  );
}