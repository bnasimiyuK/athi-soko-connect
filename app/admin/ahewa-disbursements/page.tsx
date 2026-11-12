import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PenTool } from "lucide-react";
import DisbursementTable from "./DisbursementTable";

export default async function AdminAhewaDisbursementsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const role = String((session.user as any).role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/login");

  const supabase = await createClient();

  // 1. Fetch all the data separately
  const { data: approvals, error } = await supabase
    .from("AhewaDisbursementApprovals")
    .select("*")
    .order("approved_at", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error loading disbursements: {error.message}</div>;
  }

  const { data: events } = await supabase.from("AhewaEvents").select("id, event_title");
  const { data: signatories } = await supabase.from("AhewaSignatories").select("id, name, role");

  // 2. Manually join the data in JavaScript
  const mappedApprovals = (approvals || []).map((approval: any) => {
    const event = events?.find((e) => e.id === approval.event_id);
    const signatory = signatories?.find((s) => s.id === approval.signatory_id);

    return {
      ...approval,
      event_title: event?.event_title || `Event #${approval.event_id}`,
      signatory_name: signatory?.name || `Signatory #${approval.signatory_id}`,
      signatory_role: signatory?.role || "Member",
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <PenTool className="text-purple-600" size={32} /> Disbursement Approvals
        </h1>
        <p className="text-gray-500 mt-1">Track signatory approvals for AHEWA fund disbursements.</p>
      </div>

      {/* Pass the mapped data to the interactive table */}
      <DisbursementTable approvals={mappedApprovals} />
    </div>
  );
}