"use client";

import { useState, useTransition } from "react";
import { PenTool } from "lucide-react";
import { approveDisbursement } from "./actions";

export default function ApproveButton({
  eventId,
  signatoryId,
}: {
  eventId: number;
  signatoryId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveDisbursement(eventId, signatoryId);
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition"
      >
        <PenTool size={14} />
        {isPending ? "Approving..." : "Approve"}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}