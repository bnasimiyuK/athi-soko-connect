"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Filter, Zap, X, Loader2 } from "lucide-react";
import { generateMonthlyInvoices } from "./actions";

export default function InvoiceToolbar({ currentMonthParam }: { currentMonthParam?: string }) {
  const router = useRouter();
  const defaultMonth = currentMonthParam || new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(defaultMonth);
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle "View" (Filtering the list)
  const handleView = (e: React.FormEvent) => {
    e.preventDefault();
    if (month) {
      router.push(`/admin/invoices?month=${month}`);
    } else {
      router.push(`/admin/invoices`);
    }
  };

  // Handle "Generate" (Creating new invoices)
  const handleGenerate = async () => {
    if (!month) return;
    setIsGenerating(true);
    const res = await generateMonthlyInvoices(month);
    
    if (!res.success) alert(res.error);
    else alert(`Successfully generated ${res.count} invoices for ${month}.`);
    
    setIsGenerating(false);
    router.refresh(); // Refresh to show new data
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
      
      {/* Left side: Filter Form */}
      <form onSubmit={handleView} className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2 text-gray-600 font-medium">
          <Filter size={18} /> Month:
        </div>
        <input 
          type="month" 
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-gray-300 p-2 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <button 
          type="submit" 
          className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-900 transition text-sm"
        >
          View
        </button>
        
        {currentMonthParam && (
          <Link href="/admin/invoices" className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-bold ml-2">
            <X size={16} /> Clear
          </Link>
        )}
      </form>

      {/* Right side: Generate Button */}
      <button 
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full md:w-auto bg-blue-600 text-white px-5 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-sm text-sm disabled:opacity-50"
      >
        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
        {isGenerating ? "Generating..." : "Generate Invoices"}
      </button>
    </div>
  );
}