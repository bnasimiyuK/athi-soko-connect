export const instant = false;

import { Suspense } from 'react';
import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Calendar, Clock, User, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import Link from "next/link";
import CancelBookingButton from "./CancelBookingButton";
import ReviewButton from "./ReviewButton"; // <-- Added Import

// 1. This is the async component that fetches dynamic data.
//    It must be wrapped in <Suspense> by its parent.
async function MyBookingsList() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!dbUser) redirect("/login");

  const supabase = await createClient();
  const { data: bookings, error } = await supabase
    .from("Bookings")
    .select("*")
    .eq("resident_phone", dbUser.phone)
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error loading your bookings: {error.message}</div>;
  }

  const providerIds = [...new Set(bookings?.map(b => b.provider_id) || [])];
  const { data: providers } = await supabase
    .from("Providers")
    .select("id, name")
    .in("id", providerIds);

  const providerMap = providers?.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {} as Record<number, string>) || {};

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {bookings && bookings.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <div key={booking.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-lg text-slate-900">{booking.service}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                    booking.status === 'requested' ? 'bg-yellow-100 text-yellow-700' :
                    booking.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                    booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {booking.status === 'requested' && <Clock3 size={12} />}
                    {booking.status === 'accepted' && <CheckCircle2 size={12} />}
                    {booking.status === 'completed' && <CheckCircle2 size={12} />}
                    {booking.status === 'cancelled' && <XCircle size={12} />}
                    {booking.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <User size={16} className="text-slate-400" />
                  Vendor: {providerMap[booking.provider_id] || "Unknown Vendor"}
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex gap-6 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" /> {booking.job_date}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" /> {booking.job_time}
                  </div>
                </div>
                
                {/* Show Cancel button only if requested */}
                {booking.status === 'requested' && (
                  <CancelBookingButton bookingId={booking.id} />
                )}

                {/* Show Review button only if completed and not yet reviewed */}
                {booking.status === 'completed' && !booking.reviewed && (
                  <ReviewButton bookingId={booking.id} providerId={booking.provider_id} />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No bookings yet</h3>
          <p className="text-slate-500 mb-6">You haven't requested any services from the marketplace.</p>
          <Link href="/dashboard/bookings" className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 rounded-lg font-bold transition inline-block">
            Browse Vendors
          </Link>
        </div>
      )}
    </div>
  );
}

// 2. The default export is a synchronous component that provides the static shell
//    and wraps the dynamic list in <Suspense>.
export default function ResidentBookingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Bookings</h1>
          <p className="text-slate-500 mt-1">Track the status of your service requests.</p>
        </div>
        <Link href="/dashboard/bookings" className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg font-medium transition">
          + New Booking
        </Link>
      </div>
      
      {/* The fallback here is shown while MyBookingsList is streaming in */}
      <Suspense fallback={
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          Loading your bookings...
        </div>
      }>
        <MyBookingsList />
      </Suspense>
    </div>
  );
}