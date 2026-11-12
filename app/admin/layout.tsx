export const instant = false;

import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, Users, Store, Settings, Tags, 
  HeartHandshake, PenTool, Star, Home, FileText, 
  Wallet, Globe, CalendarPlus, ClipboardCheck, type LucideIcon 
} from "lucide-react"; // <-- Added ClipboardCheck
import LogoutButton from "../dashboard/LogoutButton";

type NavItem = { href: string; label: string; icon: LucideIcon; };

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Manage Users", icon: Users },
  { href: "/admin/residents", label: "Residents", icon: Home },
  { href: "/admin/house-numbers", label: "House Numbers", icon: Home },
  
  // NEW: Visitor Approvals Link Added Here
  { href: "/admin/visitors", label: "Visitor Approvals", icon: ClipboardCheck },
  
  { href: "/admin/vendors", label: "Vendors & Providers", icon: Store },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/invoices", label: "Invoices", icon: FileText },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/ahewa-contributions", label: "AHEWA Fund", icon: HeartHandshake },
  { href: "/admin/ahewa-events", label: "Create Event", icon: CalendarPlus }, 
  { href: "/admin/ahewa-disbursements", label: "Disbursements", icon: PenTool },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

async function AdminSidebar() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");
  
  const role = String(session.user.role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/login");

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-slate-900 text-slate-300">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">Athi Admin</h1>
        <p className="text-xs text-teal-400 mt-1 truncate">{session.user.name}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
            <Icon size={20} /><span className="font-medium">{label}</span>
          </Link>
        ))}
        <div className="pt-4 mt-4 border-t border-slate-800">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition text-slate-400">
            <Globe size={20} /><span className="font-medium">Public Home</span>
          </Link>
        </div>
      </nav>
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <LogoutButton />
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Suspense fallback={<div className="hidden md:block w-64 shrink-0 bg-slate-900" />}>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-slate-900 text-white">
          <div className="p-4 flex justify-between items-center">
            <h1 className="font-bold text-teal-400">Athi Admin</h1>
            <LogoutButton />
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex shrink-0 items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 bg-slate-800 hover:text-white transition">
                <Icon size={16} /><span className="font-medium whitespace-nowrap">{label}</span>
              </Link>
            ))}
          </nav>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}