import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import ExportButton from "../../components/ExportButton";

export default async function ResidentBillingPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser || !dbUser.phone) redirect("/login");

  const supabase = await createClient();

  // 1. Get the resident's Supabase ID using their Prisma phone number
  const { data: resident } = await supabase
    .from("Residents")
    .select("id")
    .eq("phone", dbUser.phone)
    .single();

  // 2. Fetch ONLY this resident's invoices
  const { data: invoices } = resident ? await supabase
    .from("invoices")
    .select("*")
    .eq("resident_id", resident.id)
    .order("billing_month", { ascending: false }) : { data: [] };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" size={32} /> My Estate Bills
          </h1>
          <p className="text-gray-500 mt-1">View your monthly invoices and payment history.</p>
        </div>
        
        {/* Add Export Button for the Resident */}
        {invoices && invoices.length > 0 && (
          <ExportButton 
            invoices={invoices} 
            fileName={`My_Bills_${dbUser.name?.replace(/\s+/g, '_')}`} 
            residentName={dbUser.name || "Resident"}
          />
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Month</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Amount Due</th>
              <th className="px-6 py-4 text-right">Amount Paid</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices && invoices.length > 0 ? (
              invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{inv.billing_month}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">
                      {inv.type === "SERVICE" ? "Monthly Service Charge" : inv.type}
                    </p>
                    <p className="text-xs text-gray-500">House: {inv.house_number}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    KES {Number(inv.amount_due).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">
                    KES {Number(inv.amount_paid).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      inv.status === "paid" ? "bg-green-100 text-green-700" : 
                      inv.status === "overdue" ? "bg-red-100 text-red-700" : 
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {inv.status === "paid" ? <CheckCircle2 size={12}/> : 
                       inv.status === "overdue" ? <AlertCircle size={12}/> : <Clock size={12}/>}
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No invoices found. You are all caught up!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}