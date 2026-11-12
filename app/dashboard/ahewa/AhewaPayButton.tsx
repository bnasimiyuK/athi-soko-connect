"use client";

import { useState } from "react";
import { triggerAhewaPayment } from "./actions";
import { Smartphone, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AhewaPayButton({ 
  amount, 
  reference, 
  eventId 
}: { 
  amount: number; 
  reference: string; 
  eventId: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePay = async () => {
    setLoading(true);
    try {
      const result = await triggerAhewaPayment(amount, eventId, reference);
      if (result.success) {
        alert("STK Push sent! Check your phone and enter your M-Pesa PIN.");
        setTimeout(() => router.refresh(), 5000); 
      } else {
        alert("Payment failed: " + (result.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 mt-3 w-full disabled:opacity-50"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
      {loading ? "Sending..." : `Pay KES ${amount}`}
    </button>
  );
}