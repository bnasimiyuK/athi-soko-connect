import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShieldAlert, Info, CheckCircle2 } from "lucide-react";

export default async function SecurityRulesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const supabase = await createClient();

  // Fetch active rules, ordered by sort_order
  const { data: rules, error } = await supabase
    .from("GateRules")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return <div className="p-8 text-red-500">Error loading gate rules: {error.message}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <ShieldAlert className="text-orange-600" size={32} /> Estate Gate Rules
        </h1>
        <p className="text-gray-500 mt-1">Standard operating procedures for security and access control.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-slate-900 p-4 border-b border-slate-800">
          <p className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Info size={16} /> All guards must adhere to these rules at all times.
          </p>
        </div>
        
        <div className="divide-y divide-gray-100">
          {rules && rules.length > 0 ? (
            rules.map((rule: any) => (
              <div key={rule.id} className="p-6 flex gap-4 hover:bg-gray-50 transition">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-bold shrink-0 text-lg border border-orange-100">
                  {rule.sort_order}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{rule.label}</h3>
                  <p className="text-gray-600 leading-relaxed">{rule.body}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <CheckCircle2 size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No active gate rules found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}