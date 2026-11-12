export const instant = false;

import { createClient } from "@/lib/supabase/server";
import { Calendar, Clock, Home, Users, CheckCircle, Shield, AlertCircle } from "lucide-react";
import { securityApproveAndGenerate, updateVisitStatus } from "./actions";

export default async function SecurityDashboard() {
  const supabase = await createClient();

  // Fetch BOTH pending approvals and approved passes
  const { data: groups, error } = await supabase
    .from("visitor_groups")
    .select(`
      *,
      Residents (full_name),
      visitors (name, phone)
    `)
    .in("status", ["pending_security", "approved", "checked_in"])
    .order("created_at", { ascending: true });

  if (error) return <div className="text-red-500 p-8">Error loading visitors: {error.message}</div>;

  const pendingApproval = groups?.filter(g => g.status === "pending_security") || [];
  const activePasses = groups?.filter(g => g.status === "approved" || g.status === "checked_in") || [];

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* SECTION 1: PENDING SECURITY APPROVAL */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
          <AlertCircle className="text-orange-500" /> Awaiting Security Approval
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingApproval.map((group: any) => (
            <div key={group.id} className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
              <div className="bg-slate-900 p-4 text-white">
                <p className="font-bold flex items-center gap-2"><Home size={18}/> {group.house_number}</p>
              </div>
              <div className="p-5 space-y-3">
                <p><b>Visitor:</b> {group.visitors?.[0]?.name}</p>
                <p><b>Resident:</b> {group.Residents?.full_name}</p>
                <p className="text-sm text-slate-500">{group.visit_date} at {group.expected_time}</p>
                
                <form action={async () => { "use server"; await securityApproveAndGenerate(group.id); }}>
                  <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg mt-2">
                    Approve & Issue Code
                  </button>
                </form>
              </div>
            </div>
          ))}
          {pendingApproval.length === 0 && <p className="text-slate-500 col-span-full">No pending approvals.</p>}
        </div>
      </div>

      {/* SECTION 2: ACTIVE GATE PASSES */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Shield className="text-teal-600" /> Active Gate Passes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePasses.map((group: any) => {
            const expired = isExpired(group.expires_at);
            
            return (
              <div key={group.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${expired ? 'border-red-200 opacity-75' : 'border-slate-200'}`}>
                <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                  <p className="font-bold flex items-center gap-2"><Home size={18}/> {group.house_number}</p>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${group.status === 'checked_in' ? 'bg-green-500' : 'bg-teal-500'}`}>
                    {group.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase">Gate Pass Code</p>
                    <p className={`text-3xl font-mono font-bold tracking-widest ${expired ? 'text-red-500 line-through' : 'text-teal-700'}`}>
                      {group.access_code}
                    </p>
                    {expired && <p className="text-xs text-red-500 font-bold mt-1">EXPIRED (24hr limit exceeded)</p>}
                  </div>

                  <div className="space-y-1 text-sm">
                    <p><b>Visitor:</b> {group.visitors?.[0]?.name}</p>
                    <p><b>Resident:</b> {group.Residents?.full_name}</p>
                  </div>

                  {/* Actions based on status */}
                  {group.status === 'approved' && !expired && (
                    <form action={async () => { "use server"; await updateVisitStatus(group.id, "checked_in"); }}>
                      <button type="submit" className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2">
                        <CheckCircle size={16}/> Allow Entry
                      </button>
                    </form>
                  )}

                  {group.status === 'checked_in' && (
                    <form action={async () => { "use server"; await updateVisitStatus(group.id, "completed"); }}>
                      <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg">
                        Check-out Visitor
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
          {activePasses.length === 0 && <p className="text-slate-500 col-span-full">No active passes.</p>}
        </div>
      </div>

    </div>
  );
}