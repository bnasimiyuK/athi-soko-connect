"use client";

import { useState, useMemo } from "react";
import { Calendar, Clock, Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock3, ArrowUpDown } from "lucide-react";
import BookingActions from "./BookingActions";
import BookingExportButton from "../../components/BookingExportButton";

// Changed to 4 so pagination shows up immediately with small amounts of data
const ITEMS_PER_PAGE = 4;

type SortKey = "DATE_DESC" | "DATE_ASC" | "AMOUNT_DESC" | "AMOUNT_ASC";

export default function BookingList({ bookings }: { bookings: any[] }) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("DATE_DESC");
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Filtering AND Sorting Logic
  const processedBookings = useMemo(() => {
    // Filter
    const filtered = bookings.filter((b) => {
      const status = String(b.status).toUpperCase();
      let tabMatch = true;
      if (activeTab !== "ALL") tabMatch = status === activeTab;

      const searchMatch = 
        (b.resident_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (b.service?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

      return tabMatch && searchMatch;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "DATE_ASC":
          return new Date(a.job_date).getTime() - new Date(b.job_date).getTime();
        case "AMOUNT_DESC":
          return Number(b.amount || 0) - Number(a.amount || 0);
        case "AMOUNT_ASC":
          return Number(a.amount || 0) - Number(b.amount || 0);
        default: // DATE_DESC
          return new Date(b.job_date).getTime() - new Date(a.job_date).getTime();
      }
    });
  }, [bookings, activeTab, searchTerm, sortBy]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(processedBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = processedBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "REQUESTED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700"><Clock3 size={12}/> Requested</span>;
      case "ACCEPTED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700"><Clock size={12}/> Accepted</span>;
      case "COMPLETED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700"><CheckCircle2 size={12}/> Completed</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700"><XCircle size={12}/> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {["ALL", "REQUESTED", "ACCEPTED", "COMPLETED", "CANCELLED"].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab 
                ? "border-teal-600 text-teal-700 bg-teal-50/50" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Filter Bar & Export */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by resident or service..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-full sm:w-auto">
            <ArrowUpDown className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortKey); setCurrentPage(1); }}
              className="w-full sm:w-auto pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
            >
              <option value="DATE_DESC">Date: Newest</option>
              <option value="DATE_ASC">Date: Oldest</option>
              <option value="AMOUNT_DESC">Amount: High to Low</option>
              <option value="AMOUNT_ASC">Amount: Low to High</option>
            </select>
          </div>
        </div>

        <div className="w-full md:w-auto flex justify-end shrink-0">
          <BookingExportButton bookings={processedBookings} />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
          Showing {paginatedBookings.length} of {processedBookings.length} bookings
        </div>
        <div className="divide-y divide-slate-100">
          {paginatedBookings.length > 0 ? (
            paginatedBookings.map((b: any) => (
              <div key={b.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-slate-900">{b.service}</h3>
                    {getStatusBadge(b.status)}
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{b.resident_name}</p>
                  <p className="text-sm text-slate-500">{b.resident_phone}</p>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex gap-6 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400" /> {b.job_date}</div>
                    <div className="flex items-center gap-2"><Clock size={16} className="text-slate-400" /> {b.job_time}</div>
                  </div>
                  
                  {/* Show action buttons only if Requested */}
                  {b.status === 'requested' && (
                    <BookingActions bookingId={b.id} />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-500">
              No bookings found matching your filters.
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="text-sm font-medium text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}