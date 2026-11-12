"use client";

import { useState } from "react";
import { createAhewaEvent } from "./actions";
import { useRouter } from "next/navigation";
import { CalendarPlus, Users, AlertCircle, Loader2 } from "lucide-react";

type Member = {
  resident_id: number;
  Residents: { full_name: string; phone: string } | null;
};

export default function CreateEventForm({ members }: { members: Member[] }) {
  const [eventType, setEventType] = useState("PRINCIPAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const amount = eventType === "PRINCIPAL" ? 1200 : 700;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createAhewaEvent(formData);

    if (result.success) {
      alert(`Event created successfully! Invoices generated for ${result.count} members.`);
      router.push("/admin/ahewa-contributions"); // Redirect to see the generated bills
      router.refresh();
    } else {
      setError(result.error || "Failed to create event");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 text-sm font-medium border border-red-100">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Affected Member */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Affected Member (Event Owner)
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <select 
              name="affectedMemberId" 
              required 
              className="w-full border border-slate-300 pl-10 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white cursor-pointer"
            >
              <option value="">Select the AHEWA member this event is for...</option>
              {members.map((m) => (
                <option key={m.resident_id} value={m.resident_id}>
                  {m.Residents?.full_name || `Resident #${m.resident_id}`} ({m.Residents?.phone})
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500 mt-2">This member will be exempted from contributing to their own event.</p>
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Event Type</label>
          <select 
            name="eventType" 
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white cursor-pointer"
          >
            <option value="PRINCIPAL">Principal (Deceased) - KES 1,200</option>
            <option value="DEPENDANT">Dependant (Parent/Child) - KES 700</option>
          </select>
        </div>

        {/* Event Date */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Event Date</label>
          <input 
            type="date" 
            name="eventDate" 
            required 
            className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
          />
        </div>

        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-2">Event Title</label>
          <input 
            type="text" 
            name="title" 
            required 
            placeholder="e.g., Bereavement of John Doe's father" 
            className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" 
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
          <textarea 
            name="description" 
            required 
            rows={3} 
            placeholder="Provide context for the members..." 
            className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-none"
          ></textarea>
        </div>
      </div>

      {/* Billing Preview */}
      <div className="bg-teal-50 border border-teal-200 p-5 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-teal-900">Contribution per member</p>
          <p className="text-xs text-teal-700 mt-1">Billed to all AHEWA members (except the affected member)</p>
        </div>
        <p className="text-3xl font-extrabold text-teal-700">KES {amount}</p>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 shadow-md disabled:opacity-50"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <CalendarPlus size={18} />}
        {loading ? "Creating Event & Billing Members..." : "Create Event & Auto-Bill Members"}
      </button>
    </form>
  );
}