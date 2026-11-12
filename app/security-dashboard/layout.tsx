import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Users, BookOpen, Globe } from "lucide-react"; 
import LogoutButton from "../dashboard/LogoutButton"; 

async function SecuritySidebar() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");
  const role = String((session.user as any).role || "").toUpperCase();
  if (role !== "SECURITY") redirect("/login");

  return (
    <aside className="w-64 bg-white border-r border-slate-200 text-slate-600 flex-col hidden md:flex relative shrink-0">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-teal-700 tracking-tight flex items-center gap-2">
          <Shield size={24} /> Athi Security
        </h1>
        <p className="text-xs text-slate-400 mt-1 truncate">{session.user.name}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <Link href="/security-dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
          <Shield size={20} /><span className="font-medium">Gate Control</span>
        </Link>
        <Link href="/security-dashboard/visitors" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
          <Users size={20} /><span className="font-medium">Visitor Log</span>
        </Link>
        <Link href="/security-dashboard/rules" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition">
          <BookOpen size={20} /><span className="font-medium">Gate Rules</span>
        </Link>

        <div className="pt-4 mt-4 border-t border-slate-100">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 hover:text-teal-700 transition text-slate-500">
            <Globe size={20} /><span className="font-medium">Public Home</span>
          </Link>
        </div>
      </nav>

      <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-200 bg-white pb-20">
        <LogoutButton />
      </div>
    </aside>
  );
}

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Suspense fallback={<div className="w-64 bg-white border-r border-slate-200 shrink-0"></div>}>
        <SecuritySidebar />
      </Suspense>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
          <h1 className="font-bold text-teal-700">Athi Security</h1>
          <LogoutButton />
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}