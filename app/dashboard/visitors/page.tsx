export const instant = false;

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Users, Calendar, Clock, AlertCircle } from "lucide-react";
import VisitorForm from "./VisitorForm";

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return "";
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.substring(1);
  return p;
}

export default async function ResidentVisitorsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser || !dbUser.phone) redirect("/login");

  const supabase = await createClient();

  const { data: allResidents } = await supabase.from("Residents").select("id, phone");
  const resident = allResidents?.find(r => normalizePhone(r.phone) === normalizePhone(dbUser.phone));
  const residentId = resident?.id;
  
  const { data: passes } = await supabase
    .from("visitor_groups")
    .select(`
      *,
      visitors (name)
    `)
    .eq("resident_id", residentId || 0)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Visitor Management</h1>
        <p className="text-slate-500 mt-1">Pre-approve guests. Requests require Admin and Security approval before a Gate Pass is issued.</p>
      </div>

      {!residentId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm">We are creating your Resident profile. Please submit a request and we will link it automatically.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <VisitorForm />
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Your Visitor Requests</h2>
          
          {passes && passes.length > 0 ? (
            passes.map((pass: any) => (
              <div key={pass.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-slate-900">{pass.visitors?.[0]?.name || "Unknown Guest"}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                      pass.status === "approved" ? "bg-green-100 text-green-700" : 
                      pass.status === "checked_in" ? "bg-blue-100 text-blue-700" :
                      pass.status === "completed" ? "bg-slate-100 text-slate-600" : 
                      pass.status === "denied" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {pass.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {pass.visit_date}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {pass.expected_time}</span>
                  </div>
                </div>
                
                <div className="text-center bg-slate-50 p-3 rounded-lg border border-slate-200 w-full sm:w-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gate Pass Code</p>
                  <p className="text-2xl font-mono font-bold text-teal-700 tracking-widest">
                    {pass.status === "approved" || pass.status === "checked_in" || pass.status === "completed" ? pass.access_code : "---"}
                  </p>
                  {(pass.status === "pending_admin" || pass.status === "pending_security") && (
                    <p className="text-[10px] text-yellow-600 font-bold mt-1">Awaiting Approval</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-xl border-2 border-dashed border-slate-300 text-center">
              <Users size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">You have not invited any visitors yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}