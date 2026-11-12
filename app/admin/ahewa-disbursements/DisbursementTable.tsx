"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, Calendar, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import UniversalExportButton from "../../components/UniversalExportButton";

type Approval = {
  id: number;
  event_title: string;
  signatory_name: string;
  signatory_role: string;
  approved_at: string;
  notes: string | null;
};

const ITEMS_PER_PAGE = 10;

export default function DisbursementTable({ approvals }: { approvals: Approval[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [letterFilter, setLetterFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // 1. Filtering Logic
  const filteredApprovals = useMemo(() => {
    return approvals.filter((app) => {
      // Search Filter (Event Title or Signatory Name)
      const searchMatch = 
        app.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.signatory_name.toLowerCase().includes(searchTerm.toLowerCase());

      // Alphabetical Filter (Based on Event Title)
      const firstLetter = app.event_title ? app.event_title.charAt(0).toUpperCase() : "";
      const letterMatch = letterFilter === "ALL" || firstLetter === letterFilter;

      return searchMatch && letterMatch;
    });
  }, [approvals, searchTerm, letterFilter]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredApprovals.length / ITEMS_PER_PAGE);
  const paginatedApprovals = filteredApprovals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };
  const handleLetterChange = (letter: string) => {
    setLetterFilter(letter);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      
      {/* 🧹 FILTER BAR & EXPORT */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* Search */}
          <div className="flex-1 relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by event or signatory..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Clear & Export Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {(searchTerm || letterFilter !== "ALL") && (
              <button 
                onClick={() => { handleSearch(""); handleLetterChange("ALL"); }}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-2 rounded-lg transition"
              >
                <X size={16} /> Clear Filters
              </button>
            )}
            
            <UniversalExportButton 
              data={filteredApprovals}
              fileName="AHEWA_Disbursements"
              title="AHEWA Disbursement Approvals"
              columns={[
                { key: "id", label: "Approval ID" },
                { key: "event_title", label: "Event" },
                { key: "signatory_name", label: "Signatory" },
                { key: "signatory_role", label: "Role" },
                { key: "approved_at", label: "Date Approved" },
                { key: "notes", label: "Notes" }
              ]}
            />
          </div>
        </div>

        {/* Alphabetical Filter */}
        <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-700 mr-2">Filter by Event:</span>
          <button 
            onClick={() => handleLetterChange("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              letterFilter === "ALL" ? "bg-purple-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ALL
          </button>
          {alphabet.map((letter) => (
            <button
              key={letter}
              onClick={() => handleLetterChange(letter)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition ${
                letterFilter === letter ? "bg-purple-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* 📊 RESULTS TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          Showing {paginatedApprovals.length} of {filteredApprovals.length} approvals
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-slate-900 text-xs uppercase text-slate-300 font-bold">
              <tr>
                <th className="px-6 py-4">Approval ID</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">Signatory</th>
                <th className="px-6 py-4">Date Approved</th>
                <th className="px-6 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedApprovals.length > 0 ? (
                paginatedApprovals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-gray-500">
                      #{approval.id}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {approval.event_title}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs">
                          {approval.signatory_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {approval.signatory_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {approval.signatory_role}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Calendar size={14} />
                        {new Date(approval.approved_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {approval.notes ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={12} /> {approval.notes}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No notes</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No approvals found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
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