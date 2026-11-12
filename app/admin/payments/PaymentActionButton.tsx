"use client";

import { useState } from "react";
import { updatePaymentStatus } from "./actions";
import { Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PaymentActionButton({ paymentId }: { paymentId: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async (status: "verified" | "rejected") => {
    setLoading(true);
    await updatePaymentStatus(paymentId, status);
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="flex justify-end gap-2">
      <button onClick={() => handleAction("verified")} disabled={loading} className="bg-green-100 text-green-700 p-2 rounded hover:bg-green-200 disabled:opacity-50">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
      </button>
      <button onClick={() => handleAction("rejected")} disabled={loading} className="bg-red-100 text-red-700 p-2 rounded hover:bg-red-200 disabled:opacity-50">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
      </button>
    </div>
  );
}