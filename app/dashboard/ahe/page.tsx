import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, Clock, AlertCircle, Receipt, FileText, CreditCard } from "lucide-react";
import PayButton from "./PayButton";

export default async function AhePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) redirect("/login");

  const isApproved = user.aheStatus === "APPROVED";
  
  // Fetch AHE Invoices from Supabase SQL
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("Invoices")
    .select("*")
    .eq("resident_phone", user.phone) 
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">AHE Payments</h1>
        <p className="text-gray-500 mt-1">Manage your mandatory Annual Household Estate fee.</p>
      </div>

      {/* Status Card */}
      <div className={`p-8 rounded-2xl border shadow-sm ${
        isApproved ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-full ${
            isApproved ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
          }`}>
            {isApproved ? <CheckCircle2 size={32} /> : <Clock size={32} />}
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${
              isApproved ? "text-green-900" : "text-yellow-900"
            }`}>
              {isApproved ? "Payment Verified & Approved" : "Payment Pending Verification"}
            </h2>
            <p className={`mt-2 ${
              isApproved ? "text-green-700" : "text-yellow-700"
            }`}>
              {isApproved 
                ? "You are fully cleared to use all estate services, including vendor bookings."
                : "Your payment is currently being reviewed by the Admin. This usually takes a few minutes."}
            </p>
            
            {/* Show pay button if pending */}
            {!isApproved && (
              <div className="mt-4 max-w-xs">
                <PayButton amount={1.00} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <CreditCard size={20} className="text-gray-400" /> Registration Details
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Property</span>
              <span className="font-bold text-gray-900">{user.houseNumber || "N/A"} ({user.courtName || "N/A"})</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500 font-medium">M-Pesa Receipt Code</span>
              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {user.mpesaCode || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice History from SQL with Pay Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <Receipt size={20} className="text-gray-400" /> Billing History
          </h3>
          
          <div className="space-y-3">
            {invoices && invoices.length > 0 ? (
              invoices.map((invoice: any) => (
                <div key={invoice.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-bold text-gray-800">KES {invoice.amount}</p>
                      <p className="text-xs text-gray-500">{invoice.description || "Estate Bill"}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        invoice.status === "PAID" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Add Pay button for UNPAID invoices */}
                  {invoice.status !== "PAID" && (
                    <PayButton amount={Number(invoice.amount)} />
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                No past invoices found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}