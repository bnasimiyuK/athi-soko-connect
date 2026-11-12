import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FileText, Calendar } from "lucide-react";
import InvoiceToolbar from "./InvoiceToolbar";
import ExportButton from "../../components/ExportButton";

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const role = String(session.user.role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/login");

  const resolvedParams = await searchParams;
  const selectedMonth = resolvedParams.month;

  const supabase = await createClient();

  // Fetch invoices (filtered if a month is selected)
  let query = supabase
    .from("invoices")
    .select("*")
    .order("billing_month", { ascending: false });
  if (selectedMonth) {
    query = query.eq("billing_month", selectedMonth);
  }

  const { data: invoices } = await query;
  const { data: residents } = await supabase
    .from("Residents")
    .select("id, full_name");

  const nameById = new Map<number, string>(
    (residents ?? []).map((r) => [r.id, r.full_name])
  );

  // Grouping logic
  const groupedInvoices = (invoices || []).reduce(
    (acc: Record<string, any>, inv) => {
      const month = inv.billing_month || "Unknown";
      if (!acc[month]) {
        acc[month] = { invoices: [], totalDue: 0, totalPaid: 0, unpaidCount: 0 };
      }
      acc[month].invoices.push(inv);
      acc[month].totalDue += Number(inv.amount_due || 0);
      acc[month].totalPaid += Number(inv.amount_paid || 0);
      if (inv.status !== "paid") acc[month].unpaidCount += 1;
      return acc;
    },
    {}
  );

  const sortedMonths = Object.keys(groupedInvoices).sort((a, b) =>
    b.localeCompare(a)
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-blue-600" size={32} /> Monthly Invoices
        </h1>
        <p className="text-gray-500 mt-1">
          Generate and track estate bills grouped by month.
        </p>
      </div>

      {/* Unified Toolbar */}
      <InvoiceToolbar currentMonthParam={selectedMonth} />

      {/* Invoices List */}
      {sortedMonths.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">
            No invoices found {selectedMonth ? `for ${selectedMonth}` : ""}.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Generate invoices using the button above.
          </p>
        </div>
      )}

      {sortedMonths.map((month) => {
        const group = groupedInvoices[month];

        // Rows for the export file (includes resident name)
        const exportRows = group.invoices.map((inv: any) => ({
          house_number: inv.house_number,
          resident: nameById.get(inv.resident_id) || `ID: ${inv.resident_id}`,
          billing_month: inv.billing_month,
          type: inv.type,
          amount_due: Number(inv.amount_due || 0),
          amount_paid: Number(inv.amount_paid || 0),
          status: inv.status,
          due_date: inv.due_date,
        }));

        return (
          <div
            key={month}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-slate-900 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-blue-400">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{month}</h2>
                  <p className="text-xs text-slate-400">
                    {group.invoices.length} total invoices
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 items-center">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                    Total Due
                  </p>
                  <p className="text-lg font-bold text-white">
                    KES {group.totalDue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                    Collected
                  </p>
                  <p className="text-lg font-bold text-green-400">
                    KES {group.totalPaid.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                    Pending
                  </p>
                  <p className="text-lg font-bold text-orange-400">
                    {group.unpaidCount} bills
                  </p>
                </div>

                {/* Export button */}
                <div className="md:border-l border-slate-700 md:pl-6">
                  <ExportButton
                    invoices={exportRows}
                    fileName={`Estate_Invoices_${month}`}
                  />
                </div>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3">Resident / House</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3 text-right">Amount Due</th>
                    <th className="px-6 py-3 text-right">Amount Paid</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.invoices.map((inv: any) => {
                    const residentName =
                      nameById.get(inv.resident_id) || `ID: ${inv.resident_id}`;

                    return (
                      <tr key={inv.id} className="hover:bg-blue-50/50 transition">
                        <td className="px-6 py-3">
                          <p className="font-bold text-gray-900">
                            {inv.house_number}
                          </p>
                          <p className="text-xs text-gray-500">{residentName}</p>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {inv.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-gray-800">
                          {Number(inv.amount_due).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-green-600">
                          {Number(inv.amount_paid).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : inv.status === "overdue"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}