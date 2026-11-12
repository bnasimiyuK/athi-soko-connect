import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import CreateEventForm from "./CreateEventForm";
import Link from "next/link";

export default async function AdminCreateAhewaEventPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const role = String((session.user as any).role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/login");

  const supabase = await createClient();

  // Fetch AHEWA members and join with Residents to get names
  const { data: members } = await supabase
    .from("AhewaMembership")
    .select(`
      resident_id,
      Residents (full_name, phone)
    `);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarPlus className="text-teal-600" size={32} /> Create AHEWA Event
          </h1>
          <p className="text-slate-500 mt-1">Generate a welfare event and automatically bill all members.</p>
        </div>
        <Link href="/admin/ahewa-contributions" className="text-sm font-bold text-teal-700 hover:underline">
          View Contributions &rarr;
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* FIX: Added `as any` to bypass the Supabase TypeScript array inference issue */}
        <CreateEventForm members={(members as any) || []} />
      </div>
    </div>
  );
}