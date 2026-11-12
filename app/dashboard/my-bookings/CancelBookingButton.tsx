"use client";

import { useState } from "react";
import { cancelBooking } from "../bookings/actions"; // Ensure this path is correct
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function CancelBookingButton({ bookingId }: { bookingId: number }) {
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setIsCancelling(true);
    const result = await cancelBooking(bookingId);
    
    if (result.success) {
      router.refresh(); // Refresh the page to show the new "cancelled" status
    } else {
      alert("Failed to cancel booking.");
    }
    setIsCancelling(false);
  };

  return (
    <button
      onClick={handleCancel}
      disabled={isCancelling}
      className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
    >
      <XCircle size={16} /> {isCancelling ? "Cancelling..." : "Cancel"}
    </button>
  );
}