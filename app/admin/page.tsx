export const instant = false; // <-- FIXED: Stops the Next.js caching error overlay

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Store, CalendarCheck, AlertTriangle, Star } from "lucide-react";

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");
  
  const role = String((session.user as any).role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/login");

  const supabase = await createClient();

  // Fetch Metrics
  const totalResidents = await prisma.user.count({ where: { role: "RESIDENT" } });
  const { count: pendingVendors } = await supabase.from("Providers").select("*", { count: 'exact', head: true }).eq("verified", false);
  const { count: totalVendors } = await supabase.from("Providers").select("*", { count: 'exact', head: true });
  const { count: totalBookings } = await supabase.from("Bookings").select("*", { count: 'exact', head: true });
  
  // Fetch Action Queues
  const { data: recentReviews } = await supabase.from("Reviews").select("*").order("created_at", { ascending: false }).limit(5);
  const { data: pendingVendorList } = await supabase.from("Providers").select("id, name, phone, created_at").eq("verified", false).limit(5);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Admin Console</h1>
        <p className="text-gray-500 mt-1">Approve listings, review reports, and monitor estate activity.</p>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Residents</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{totalResidents}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24} /></div>
          </div>
          <Link href="/admin/users" className="text-blue-600 text-sm mt-4 inline-block hover:underline">Manage Residents &rarr;</Link>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Vendors</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{totalVendors || 0}</p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Store size={24} /></div>
          </div>
          <Link href="/admin/vendors" className="text-green-600 text-sm mt-4 inline-block hover:underline">Manage Vendors &rarr;</Link>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pending Vendors</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{pendingVendors || 0}</p>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><AlertTriangle size={24} /></div>
          </div>
          <Link href="/admin/vendors" className="text-orange-600 text-sm mt-4 inline-block hover:underline">Review Pending &rarr;</Link>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{totalBookings || 0}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><CalendarCheck size={24} /></div>
          </div>
          <Link href="/admin/bookings" className="text-purple-600 text-sm mt-4 inline-block hover:underline">View All &rarr;</Link>
        </div>
      </div>

      {/* Action Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Vendor Verification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Store size={20} /> Pending Verification</h2>
            <Link href="/admin/vendors" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-4">
            {pendingVendorList && pendingVendorList.length > 0 ? (
              pendingVendorList.map(vendor => (
                <div key={vendor.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-800">{vendor.name}</p>
                    <p className="text-xs text-gray-500">{vendor.phone}</p>
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">Action Needed</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No pending vendors.</p>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Star size={20} /> Recent Reviews</h2>
            <Link href="/admin/reviews" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-4">
            {recentReviews && recentReviews.length > 0 ? (
              recentReviews.map(review => (
                <div key={review.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-1 text-yellow-500 mb-1">
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />)}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">"{review.comment}"</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No reviews yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}