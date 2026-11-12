import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  // 1. Check the user is logged in via NextAuth
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const sessionUser = session.user as any;
  const userId = sessionUser.id;
  const sessionRole = String(sessionUser.role ?? "").toUpperCase();

  // 2. Fetch the resident's profile by id
  let resident = null;
  try {
    if (userId) {
      resident = await prisma.user.findUnique({
        where: { id: userId },
      });
    }
  } catch (error) {
    console.error("Error fetching resident:", error);
  }

  return (
    <div className="space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {resident?.name?.split(" ")[0] || "Resident"}! 👋
        </h1>
        <p className="text-teal-100">
          Here is what is happening in your estate today.
        </p>

        <div className="mt-6 flex flex-wrap gap-6 text-sm font-medium bg-black/10 p-4 rounded-xl inline-flex">
          <div>
            <span className="text-teal-200 block text-xs uppercase tracking-wider">Phone</span>
            <span className="text-lg">{resident?.phone || "N/A"}</span>
          </div>
          <div className="w-px bg-white/20 hidden sm:block"></div>
          <div>
            <span className="text-teal-200 block text-xs uppercase tracking-wider">Role</span>
            <span className="text-lg">{resident?.role || sessionRole || "RESIDENT"}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Bookings Card */}
          <Link href="/dashboard/bookings" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-teal-300 transition-all">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Book a Service</h3>
            <p className="text-sm text-gray-500">Find and book local service providers like plumbers, cleaners, and more.</p>
          </Link>

          {/* Invoices Card */}
          <Link href="/dashboard/invoices" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Estate Bills</h3>
            <p className="text-sm text-gray-500">View your monthly invoices, check balances, and pay via M-Pesa.</p>
          </Link>

          {/* Visitors Card */}
          <Link href="/dashboard/visitors" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-purple-300 transition-all">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Invite Visitors</h3>
            <p className="text-sm text-gray-500">Pre-approve guests and generate secure gate access codes.</p>
          </Link>

          {/* Ahewa Card */}
          <Link href="/dashboard/ahewa" className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-orange-300 transition-all">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Ahewa Contributions</h3>
            <p className="text-sm text-gray-500">Manage your community welfare contributions and view events.</p>
          </Link>

        </div>
      </div>

    </div>
  );
}