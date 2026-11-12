export const instant = false;

import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookingList from "./BookingList";

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return "";
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.substring(1);
  return p;
}

export default async function ProviderBookingsPage() {
  // 1. NextAuth Session
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  // 2. Get Prisma User for the Phone Number
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser || !dbUser.phone) {
    return <div className="p-8 text-red-500">User not found in Prisma DB.</div>;
  }

  const supabase = await createClient();

  // 3. Get Supabase Provider ID via normalized Phone Number
  const normalizedPrismaPhone = normalizePhone(dbUser.phone);
  const { data: providers } = await supabase.from("Providers").select("id, phone");
  const provider = providers?.find(p => normalizePhone(p.phone) === normalizedPrismaPhone);

  if (!provider) {
    return <div className="p-8 text-red-500">Provider profile not found in Supabase.</div>;
  }

  // 4. Fetch ALL bookings for this provider
  const { data: bookings } = await supabase
    .from("Bookings")
    .select("*")
    .eq("provider_id", provider.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">All Bookings</h1>
        <p className="text-slate-500 mt-1">Manage your incoming and completed jobs.</p>
      </div>

      {/* Render the new Client Component that handles filtering, pagination, and export */}
      <BookingList bookings={bookings || []} />
    </div>
  );
}