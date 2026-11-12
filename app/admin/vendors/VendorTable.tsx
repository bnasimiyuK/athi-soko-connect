"use client";

import { useState, useMemo } from "react";
import { Star, Phone, Clock, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import VerifyButton from "./VerifyButton"; // Assuming you still have this
import UniversalExportButton from "../../components/UniversalExportButton";

type Vendor = {
  id: number;
  name: string;
  phone: string;
  hours: string | null;
  services: string | null;
  rating: number | null;
  verified: boolean;
};

const ITEMS_PER_PAGE = 10;

export default function VendorTable({ vendors }: { vendors: Vendor[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [letterFilter, setLetterFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // 1. Filtering Logic
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      // Search Filter
      const searchMatch = 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.phone.includes(searchTerm);

      // Letter Filter
      const firstLetter = vendor.name.charAt(0).toUpperCase();
      const letterMatch = letterFilter === "ALL" || firstLetter === letterFilter;

      return searchMatch && letterMatch;
    });
  }, [vendors, searchTerm, letterFilter]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const paginatedVendors = filteredVendors.slice(
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
              placeholder="Search business name or phone..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
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
              data={filteredVendors}
              fileName="Estate_Vendors"
              title="Registered Vendors"
              columns={[
                { key: "name", label: "Business Name" },
                { key: "phone", label: "Phone" },
                { key: "services", label: "Services" },
                { key: "hours", label: "Hours" },
                { key: "rating", label: "Rating" },
                { key: "verified", label: "Status" }
              ]}
            />
          </div>
        </div>

        {/* Alphabetical Filter */}
        <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-700 mr-2">Filter:</span>
          <button 
            onClick={() => handleLetterChange("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              letterFilter === "ALL" ? "bg-green-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ALL
          </button>
          {alphabet.map((letter) => (
            <button
              key={letter}
              onClick={() => handleLetterChange(letter)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition ${
                letterFilter === letter ? "bg-green-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-200"
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
          Showing {paginatedVendors.length} of {filteredVendors.length} vendors
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Business Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Services</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedVendors.length > 0 ? (
                paginatedVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                          {vendor.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{vendor.name}</p>
                          <div className="flex items-center gap-1 text-xs text-yellow-600 mt-1">
                            <Star size={12} fill="currentColor" /> {vendor.rating || "New"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" /> {vendor.phone}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock size={14} className="text-gray-400" /> {vendor.hours || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="line-clamp-2 max-w-xs">{vendor.services || "No services listed"}</p>
                    </td>
                    <td className="px-6 py-4">
                      {vendor.verified ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <VerifyButton vendorId={vendor.id} isVerified={vendor.verified} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No vendors found matching your filters.
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