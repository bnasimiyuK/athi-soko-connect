"use client";

import { updateBookingStatus } from "../actions";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingActions({ bookingId }: { bookingId: number }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleAction = async (status: string) => {
    setIsUpdating(true);
    try {
      const result = await updateBookingStatus(bookingId, status);
      
      if (result.success) {
        // Force the page to refresh and show the new status
        router.refresh(); 
      } else {
        // Alert the user if Supabase blocked the update
        alert("Failed to update booking. Check RLS policies. Error: " + result.error);
      }
    } catch (error) {
      console.error("Failed to update booking:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={() => handleAction("accepted")}
        disabled={isUpdating}
        className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
      >
        <Check size={16} /> {isUpdating ? "Saving..." : "Accept"}
      </button>
      <button 
        onClick={() => handleAction("cancelled")}
        disabled={isUpdating}
        className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
      >
        <X size={16} /> {isUpdating ? "Saving..." : "Decline"}
      </button>
    </div>
  );
}