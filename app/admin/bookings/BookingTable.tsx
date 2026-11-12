"use client";

import { useState, useMemo } from "react";
import { Calendar, Clock, User, Store, Search, X, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import UniversalExportButton from "../../components/UniversalExportButton";

type Booking = {
  id: number;
  service: string;
  resident_name: string;
  resident_phone: string;
  job_date: string;
  job_time: string;
  status: string;
  provider_name: string; // Joined from Providers table
  created_at: string;
};

const ITEMS_PER_PAGE = 10;

export default function BookingTable({ bookings }: { bookings: Booking[] }) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Filtering Logic
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Tab Filter (Status)
      let tabMatch = true;
      if (activeTab !== "ALL") tabMatch = b.status.toUpperCase() === activeTab;

      // Search Filter
      const searchMatch = 
        b.resident_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.resident_phone?.includes(searchTerm) ||
        b.service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.provider_name?.toLowerCase().includes(searchTerm.toLowerCase());

      return tabMatch && searchMatch;
    });
  }, [bookings, activeTab, searchTerm]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

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
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { id: "ALL", label: "All Bookings" },
          { id: "REQUESTED", label: "Requested" },
          { id: "ACCEPTED", label: "Accepted" },
          { id: "COMPLETED", label: "Completed" },
          { id: "CANCELLED", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id 
                ? "border-purple-600 text-purple-700 bg-purple-50/50" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar & Export */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by resident, vendor, or service..." 
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {searchTerm && (
            <button 
              onClick={() => handleSearch("")}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-2 rounded-lg transition"
            >
              <X size={16} /> Clear
            </button>
          )}

          <UniversalExportButton 
            data={filteredBookings}
            fileName={`Estate_Bookings_${activeTab}`}
            title="Estate Bookings Report"
            columns={[
              { key: "id", label: "Booking ID" },
              { key: "service", label: "Service" },
              { key: "resident_name", label: "Resident" },
              { key: "resident_phone", label: "Phone" },
              { key: "provider_name", label: "Vendor" },
              { key: "job_date", label: "Date" },
              { key: "job_time", label: "Time" },
              { key: "status", label: "Status" }
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          Showing {paginatedBookings.length} of {filteredBookings.length} bookings
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Resident</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedBookings.length > 0 ? (
                paginatedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-bold text-gray-900">{b.service}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800">{b.resident_name || "Unknown"}</p>
                      <p className="text-xs text-gray-500">{b.resident_phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Store size={14} className="text-gray-400" />
                        <span>{b.provider_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar size={14} className="text-gray-400" /> {b.job_date}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock size={14} className="text-gray-400" /> {b.job_time}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(b.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No bookings found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-white">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}