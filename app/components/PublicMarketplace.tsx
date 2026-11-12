"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, MapPin, Star, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 3; // Reduced to fit on one screen

export default function PublicMarketplace({ initialOfferings }: { initialOfferings: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [maxPrice, setMaxPrice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Safely extract categories
  const categories = useMemo(() => {
    const cats = new Set(
      initialOfferings.map(o => {
        const cat = Array.isArray(o.Categories) ? o.Categories[0] : o.Categories;
        return cat?.label;
      }).filter(Boolean)
    );
    return ["ALL", ...Array.from(cats)];
  }, [initialOfferings]);

  // Filtering Logic
  const filteredOfferings = useMemo(() => {
    return initialOfferings.filter((offer) => {
      const searchMatch = offer.services?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = categoryFilter === "ALL" || 
        (Array.isArray(offer.Categories) ? offer.Categories[0]?.label : offer.Categories?.label) === categoryFilter;
      const priceMatch = !maxPrice || Number(offer.price_from) <= Number(maxPrice);

      return searchMatch && categoryMatch && priceMatch;
    });
  }, [initialOfferings, searchTerm, categoryFilter, maxPrice]);

  const totalPages = Math.ceil(filteredOfferings.length / ITEMS_PER_PAGE);
  const paginatedOfferings = filteredOfferings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto px-4 py-2">
      
      {/* Compact Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-col sm:flex-row gap-3 items-end shrink-0 z-20">
        <div className="flex-1 w-full relative">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Service</label>
          <Search className="absolute left-2.5 top-7 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="e.g., Deep Cleaning" 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full border border-slate-300 pl-8 pr-2 py-1.5 rounded-md text-sm outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="w-full sm:w-40">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
          <select 
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="w-full border border-slate-300 px-2 py-1.5 rounded-md text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === "ALL" ? "All Categories" : cat}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-32">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Price (KES)</label>
          <input 
            type="number" 
            placeholder="e.g., 2000" 
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }}
            className="w-full border border-slate-300 px-2 py-1.5 rounded-md text-sm outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Results Area - Flexes to fill remaining space */}
      <div className="flex-1 overflow-y-auto mt-4 min-h-0">
        {paginatedOfferings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paginatedOfferings.map((offer) => {
              // Safely parse provider data (Supabase sometimes returns an array)
              const provider = Array.isArray(offer.Providers) ? offer.Providers[0] : offer.Providers;
              const cat = Array.isArray(offer.Categories) ? offer.Categories[0] : offer.Categories;

              return (
                <div key={offer.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition">
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{offer.services}</h3>
                        <p className="text-xs text-teal-600 font-bold line-clamp-1">{provider?.name}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                        <Star size={10} fill="currentColor" /> {provider?.rating || "New"}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">{cat?.label}</p>
                  </div>
                  
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center rounded-b-xl">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">KES {Number(offer.price_from).toLocaleString()}</p>
                    </div>
                    <Link href="/login" className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                      Book Now
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
            <h3 className="text-slate-800 font-bold">No services found</h3>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls - Pinned to bottom */}
      {totalPages > 1 && (
        <div className="shrink-0 mt-2 flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-slate-200">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-xs text-slate-600">Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

    </div>
  );
}