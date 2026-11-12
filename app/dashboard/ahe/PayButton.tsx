"use client";

import { useState } from "react";
import { triggerAhePayment } from "./actions";
import { Smartphone, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PayButton({ amount }: { amount: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePay = async () => {
    setLoading(true);
    const result = await triggerAhePayment(amount);
    
    if (result.success) {
      alert("STK Push sent! Check your phone and enter your M-Pesa PIN.");
      // The webhook will update the DB, so we refresh after a short delay
      setTimeout(() => router.refresh(), 5000); 
    } else {
      alert("Payment failed: " + result.error);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 w-full mt-3"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />}
      {loading ? "Sending Request..." : `Pay KES ${amount.toFixed(2)} via M-Pesa`}
    </button>
  );
}