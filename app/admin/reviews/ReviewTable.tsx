"use client";

import { useState, useMemo } from "react";
import { Star, MessageSquare, User, Store, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import UniversalExportButton from "../../components/UniversalExportButton";

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  resident_name: string | null;
  provider_id: number;
  created_at: string;
};

const ITEMS_PER_PAGE = 10;

export default function ReviewTable({ reviews }: { reviews: Review[] }) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [letterFilter, setLetterFilter] = useState("ALL"); // <-- Added A-Z filter state
  const [currentPage, setCurrentPage] = useState(1);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // 1. Filtering Logic
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      // Tab Filter (All, 5-Star, Low)
      let tabMatch = true;
      if (activeTab === "5_STAR") tabMatch = review.rating === 5;
      if (activeTab === "LOW") tabMatch = review.rating <= 3;

      // Search Filter (Comment, Name, Provider ID)
      const searchMatch = 
        (review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (review.resident_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        review.provider_id.toString().includes(searchTerm);

      // Alphabetical Filter (Based on Resident Name)
      const firstLetter = review.resident_name ? review.resident_name.charAt(0).toUpperCase() : "";
      const letterMatch = letterFilter === "ALL" || firstLetter === letterFilter;

      return tabMatch && searchMatch && letterMatch;
    });
  }, [reviews, activeTab, searchTerm, letterFilter]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
  const paginatedReviews = filteredReviews.slice(
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

  return (
    <div className="space-y-4">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "ALL", label: "All Reviews" },
          { id: "5_STAR", label: "5 Star Reviews" },
          { id: "LOW", label: "Low Ratings (≤ 3)" },
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

      {/* Filter Bar & Export */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        
        {/* Top Row: Search and Export */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by comment, resident name, or provider ID..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {(searchTerm || letterFilter !== "ALL") && (
              <button 
                onClick={() => { handleSearch(""); handleLetterChange("ALL"); }}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-2 rounded-lg transition"
              >
                <X size={16} /> Clear Filters
              </button>
            )}

            <UniversalExportButton 
              data={filteredReviews}
              fileName="Platform_Reviews"
              title="Platform Reviews Report"
              columns={[
                { key: "id", label: "Review ID" },
                { key: "rating", label: "Rating" },
                { key: "provider_id", label: "Provider ID" },
                { key: "resident_name", label: "Resident" },
                { key: "comment", label: "Comment" },
                { key: "created_at", label: "Date" }
              ]}
            />
          </div>
        </div>

        {/* Bottom Row: Alphabetical Filter */}
        <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-700 mr-2">Filter Resident:</span>
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
          Showing {paginatedReviews.length} of {filteredReviews.length} reviews
        </div>
        <div className="divide-y divide-gray-200">
          {paginatedReviews.length > 0 ? (
            paginatedReviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-gray-50 transition flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} fill={i < review.rating ? "currentColor" : "none"} />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-gray-800">{review.rating}.0 / 5.0</span>
                  </div>
                  
                  <p className="text-gray-700 text-lg mb-4">
                    {review.comment ? `"${review.comment}"` : <span className="text-gray-400 italic">No comment left</span>}
                  </p>
                  
                  <div className="flex gap-6 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1">
                      <User size={14} /> {review.resident_name || "Resident"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Store size={14} /> Provider ID: {review.provider_id}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-start md:items-center">
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString('en-GB', { 
                      day: 'numeric', month: 'short', year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
              <p>No reviews found matching your filters.</p>
            </div>
          )}
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