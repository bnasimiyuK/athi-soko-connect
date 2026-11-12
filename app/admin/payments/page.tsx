import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Wallet, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import PaymentActionButton from "./PaymentActionButton";
import UniversalExportButton from "../../components/UniversalExportButton"; // <-- Added Import

export default async function AdminPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const supabase = await createClient();
  
  // Fetch from the lowercase 'payments' table and order by 'payment_date'
  const { data: payments, error } = await supabase
    .from("payments") 
    .select("*")
    .order("payment_date", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error loading payments: {error.message}</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Export Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="text-blue-600" size={32} /> Payments
          </h1>
          <p className="text-gray-500 mt-1">Verify M-Pesa transactions and manual reports.</p>
        </div>

        {/* ADD EXPORT BUTTON HERE */}
        {payments && payments.length > 0 && (
          <UniversalExportButton 
            data={payments}
            fileName="Estate_Payments"
            title="Estate Payments Report"
            columns={[
              { key: "house_number", label: "House No." },
              { key: "mpesa_phone", label: "Phone" },
              { key: "amount", label: "Amount (KES)" },
              { key: "mpesa_receipt", label: "M-Pesa Code" },
              { key: "method", label: "Method" },
              { key: "status", label: "Status" },
              { key: "payment_date", label: "Date" }
            ]}
          />
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">House / Phone</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">M-Pesa Receipt</th>
                <th className="px-6 py-4">Method / Purpose</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments && payments.length > 0 ? (
                payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{p.house_number || "N/A"}</p>
                      <p className="text-xs text-gray-500">{p.mpesa_phone || `Resident ID: ${p.resident_id}`}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">
                      KES {Number(p.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-100 font-bold text-xs uppercase">
                        {p.mpesa_receipt || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded w-fit uppercase mb-1">
                        <Smartphone size={12} /> {p.method || "M-Pesa"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {p.invoice_id ? `Invoice #${p.invoice_id}` : "General Payment"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      }) : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        p.status === "verified" ? "bg-green-100 text-green-700" : 
                        p.status === "rejected" ? "bg-red-100 text-red-700" : 
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {p.status === "verified" ? <CheckCircle2 size={12}/> : p.status === "rejected" ? <XCircle size={12}/> : null}
                        {p.status || "PENDING"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Only show action buttons if the payment is pending */}
                      {p.status === "pending" ? (
                        <PaymentActionButton paymentId={p.id} />
                      ) : (
                        <span className="text-xs text-gray-400 italic">No actions</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No payments found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}