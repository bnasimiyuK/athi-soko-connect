"use client";

import { useState } from "react";
import { createVisitorPass } from "./actions";
import { useRouter } from "next/navigation";
import { PlusCircle, Loader2 } from "lucide-react";

export default function VisitorForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const res = await createVisitorPass(formData);

    if (res.success) {
      setSuccess("Request submitted! Awaiting Admin and Security approval.");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      setError(res.error || "Failed to submit request");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <PlusCircle size={20} className="text-teal-600" /> Invite a Guest
      </h2>
      
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Visitor Name</label>
          <input type="text" name="visitorName" required placeholder="e.g., John Doe" className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Visitor Phone</label>
          <input type="tel" name="visitorPhone" required placeholder="e.g., 0712345678" className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" name="visitDate" required className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
            <input type="time" name="expectedTime" required className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
          <input type="text" name="purpose" required placeholder="e.g., Family Visit" className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="pt-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input type="checkbox" name="hasVehicle" className="w-4 h-4 text-teal-600 rounded" />
            Bringing a vehicle?
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-xs text-slate-500 mb-1">Vehicle Type</label>
            <input type="text" name="vehicleType" placeholder="Car / Bike" className="w-full border border-slate-300 p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Plate Number</label>
            <input type="text" name="plateNumber" placeholder="KDA 123X" className="w-full border border-slate-300 p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-teal-500 uppercase" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-lg transition mt-2 flex justify-center items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? "Submitting..." : "Request Gate Pass"}
        </button>
      </form>
    </div>
  );
}