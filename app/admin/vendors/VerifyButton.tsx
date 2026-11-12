"use client";

import { useState } from "react";
import { toggleVendorVerification } from "./actions";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export default function VerifyButton({ 
  vendorId, 
  isVerified 
}: { 
  vendorId: number; 
  isVerified: boolean; 
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setIsUpdating(true);
    const result = await toggleVendorVerification(vendorId, isVerified);
    
    if (result.success) {
      router.refresh();
    } else {
      alert("Failed to update verification status.");
    }
    setIsUpdating(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition disabled:opacity-50 ${
        isVerified 
          ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
          : "bg-green-100 text-green-700 hover:bg-green-200"
      }`}
    >
      {isVerified ? (
        <>
          <ShieldAlert size={16} /> Unverify
        </>
      ) : (
        <>
          <ShieldCheck size={16} /> Verify
        </>
      )}
    </button>
  );
}