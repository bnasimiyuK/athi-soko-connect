export const instant = false; // <-- THIS MUST BE LINE 1

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Home, Calendar, FileText, Users, List, CreditCard, HeartHandshake, Bell, Globe, ArrowLeftRight } from "lucide-react"; 
import LogoutButton from "./LogoutButton";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const isVendor = String((session.user as any).role).toUpperCase() === "VENDOR";

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 text-slate-600 flex-col hidden md:flex relative">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-teal-700 tracking-tight">Athi Resident</h1>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {session.user.name || (session.user as any).phone}
          </p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
            <Home size={20} /><span className="font-medium">Overview</span>
          </Link>
          <Link href="/dashboard/bookings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
            <Calendar size={20} /><span className="font-medium">Book a Service</span>
          </Link>
          <Link href="/dashboard/my-bookings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
            <List size={20} /><span className="font-medium">My Bookings</span>
          </Link>
          <Link href="/dashboard/invoices" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
            <FileText size={20} /><span className="font-medium">Estate Bills</span>
          </Link>
          
          <Link href="/dashboard/ahe" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
            <CreditCard size={20} /><span className="font-medium">AHE Payments</span>
          </Link>
          <Link href="/dashboard/ahewa" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
            <HeartHandshake size={20} /><span className="font-medium">AHEWA Fund</span>
          </Link>
          <Link href="/dashboard/visitors" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
            <Users size={20} /><span className="font-medium">Visitors</span>
          </Link>
          <Link href="/dashboard/notices" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
            <Bell size={20} /><span className="font-medium">Estate Notices</span>
          </Link>

          {isVendor && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link href="/provider-dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-teal-50 text-teal-700 font-bold transition hover:bg-teal-100">
                <ArrowLeftRight size={20} /><span className="font-medium">Switch to Vendor</span>
              </Link>
            </div>
          )}

          <div className="pt-2">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition text-slate-500">
              <Globe size={20} /><span className="font-medium">Public Home</span>
            </Link>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-200 bg-white pb-20">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
          <h1 className="font-bold text-teal-700">Athi Resident</h1>
          <LogoutButton />
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}