"use client";

import { useState, useMemo } from "react";
import { Phone, CheckCircle2, XCircle, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toggleAheStatus } from "./actions";
import { useRouter } from "next/navigation";
import UniversalExportButton from "../../components/UniversalExportButton"; // <-- Added Import

type Resident = {
  id: string;
  name: string | null;
  phone: string;
  phase: string | null;
  courtName: string | null;
  houseNumber: string | null;
  aheStatus: string | null;
  createdAt: Date | string;
};

const ITEMS_PER_PAGE = 10;

export default function ResidentTable({ residents }: { residents: Resident[] }) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [letterFilter, setLetterFilter] = useState("ALL"); 
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const router = useRouter();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // 1. Filtering Logic
  const filteredResidents = useMemo(() => {
    return residents.filter((res) => {
      const status = (res.aheStatus || "PENDING").toUpperCase();
      
      let tabMatch = true;
      if (activeTab === "PENDING") tabMatch = status === "PENDING";
      if (activeTab === "APPROVED") tabMatch = status === "APPROVED";

      const searchMatch = 
        (res.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        res.phone.includes(searchTerm) ||
        (res.houseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

      const firstLetter = res.name ? res.name.charAt(0).toUpperCase() : "";
      const letterMatch = letterFilter === "ALL" || firstLetter === letterFilter;

      return tabMatch && searchMatch && letterMatch;
    });
  }, [residents, activeTab, searchTerm, letterFilter]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredResidents.length / ITEMS_PER_PAGE);
  const paginatedResidents = filteredResidents.slice(
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
  const handleLetterChange = (letter: string) => {
    setLetterFilter(letter);
    setCurrentPage(1);
  };

  // 3. Action Handler
  const handleToggle = async (userId: string, currentStatus: string | null) => {
    setLoadingId(userId);
    const newStatus = currentStatus === "APPROVED" ? "PENDING" : "APPROVED";
    await toggleAheStatus(userId, newStatus);
    router.refresh();
    setLoadingId(null);
  };

  return (
    <div className="space-y-4">
      
      {/* Tabs & Export Button Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex border-b border-gray-200 w-full md:w-auto">
          {[
            { id: "ALL", label: "All Residents" },
            { id: "PENDING", label: "Pending AHE" },
            { id: "APPROVED", label: "Approved AHE" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
                activeTab === tab.id 
                  ? "border-blue-600 text-blue-700 bg-blue-50/50" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ADD EXPORT BUTTON HERE */}
        <div className="shrink-0 mb-2">
          <UniversalExportButton 
            data={filteredResidents}
            fileName={`Residents_${activeTab}`}
            title={`Estate Residents - ${activeTab}`}
            columns={[
              { key: "name", label: "Name" },
              { key: "phone", label: "Phone" },
              { key: "houseNumber", label: "House No." },
              { key: "courtName", label: "Court" },
              { key: "phase", label: "Phase" },
              { key: "aheStatus", label: "AHE Status" }
            ]}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, phone, or house number..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          {(searchTerm || letterFilter !== "ALL") && (
            <button 
              onClick={() => { handleSearch(""); handleLetterChange("ALL"); }}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-2 rounded-lg transition"
            >
              <X size={16} /> Clear Filters
            </button>
          )}
        </div>

        {/* Alphabetical Filter */}
        <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-700 mr-2">Filter:</span>
          <button 
            onClick={() => handleLetterChange("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              letterFilter === "ALL" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ALL
          </button>
          {alphabet.map((letter) => (
            <button
              key={letter}
              onClick={() => handleLetterChange(letter)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition ${
                letterFilter === letter ? "bg-blue-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          Showing {paginatedResidents.length} of {filteredResidents.length} residents
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Property Details</th>
                <th className="px-6 py-4">AHE Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedResidents.length > 0 ? (
                paginatedResidents.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          {res.name?.charAt(0) || "R"}
                        </div>
                        <p className="font-bold text-gray-900">{res.name || "Unnamed"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1"><Phone size={14} /> {res.phone}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{res.houseNumber || "N/A"}</p>
                      <p className="text-xs text-gray-500">{res.courtName || "N/A"} • {res.phase || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        res.aheStatus === "APPROVED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {res.aheStatus === "APPROVED" ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                        {res.aheStatus || "PENDING"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleToggle(res.id, res.aheStatus)}
                        disabled={loadingId === res.id}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50 ${
                          res.aheStatus === "APPROVED" 
                            ? "bg-red-50 text-red-600 hover:bg-red-100" 
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {loadingId === res.id ? "..." : res.aheStatus === "APPROVED" ? "Revoke" : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No residents found matching your filters.
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