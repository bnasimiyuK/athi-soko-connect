import { createClient } from "@/lib/supabase/server";
import { Users, Check, X } from "lucide-react";
import { adminApproveVisitor, adminDenyVisitor } from "./actions";

export default async function AdminVisitorsPage() {
  const supabase = await createClient();
  
  const { data: pending } = await supabase
    .from("visitor_groups")
    .select(`*, Residents(full_name), visitors(name, phone)`)
    .eq("status", "pending_admin")
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="text-teal-600" size={32} /> Visitor Approvals
        </h1>
        <p className="text-slate-500 mt-1">Stage 1: Review resident requests before sending to Security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pending?.map((group: any) => (
          <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg text-slate-900">{group.visitors?.[0]?.name}</p>
                <p className="text-sm text-slate-500">{group.visitors?.[0]?.phone}</p>
              </div>
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded">PENDING</span>
            </div>
            
            <div className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p><b>Visiting:</b> {group.Residents?.full_name} ({group.house_number})</p>
              <p><b>Date:</b> {group.visit_date} at {group.expected_time}</p>
              <p><b>Purpose:</b> {group.purpose}</p>
            </div>

            <div className="flex gap-2">
              <form action={async () => { "use server"; await adminApproveVisitor(group.id); }} className="flex-1">
                <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-1">
                  <Check size={16}/> Approve
                </button>
              </form>
              <form action={async () => { "use server"; await adminDenyVisitor(group.id); }} className="flex-1">
                <button type="submit" className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 rounded-lg flex justify-center items-center gap-1">
                  <X size={16}/> Deny
                </button>
              </form>
            </div>
          </div>
        ))}
        {(!pending || pending.length === 0) && (
          <p className="col-span-full text-slate-500 py-10 text-center">No pending visitor requests.</p>
        )}
      </div>
    </div>
  );
}