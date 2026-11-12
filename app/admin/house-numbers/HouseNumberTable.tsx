"use client";

import { useState, useEffect, useMemo } from "react";
import { updateHouseNumber } from "./actions";
import { Search, Save, Edit2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

type Resident = {
  id: string;
  name: string | null;
  phone: string;
  phase: string | null;
  courtName: string | null;
  houseNumber: string | null;
};

type Court = {
  id: number;
  name: string;
  phase: number;
};

const ITEMS_PER_PAGE = 10;

export default function HouseNumberTable({ 
  residents, 
  allCourts 
}: { 
  residents: Resident[]; 
  allCourts: Court[]; 
}) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>("1"); 
  const [court, setCourt] = useState<string>("");
  const [house, setHouse] = useState<string>("");
  
  const router = useRouter();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // 1. Filtering Logic
  const filteredResidents = useMemo(() => {
    return residents.filter((res) => {
      // Tab Filter
      let tabMatch = true;
      if (activeTab === "ASSIGNED") tabMatch = !!res.houseNumber;
      if (activeTab === "UNASSIGNED") tabMatch = !res.houseNumber;

      // Search Filter
      const searchMatch = 
        (res.name?.toLowerCase().includes(search.toLowerCase()) || false) || 
        res.phone.includes(search);

      // Letter Filter
      const firstLetter = res.name ? res.name.charAt(0).toUpperCase() : "";
      const letterMatch = letterFilter === "ALL" || firstLetter === letterFilter;

      return tabMatch && searchMatch && letterMatch;
    });
  }, [residents, activeTab, search, letterFilter]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredResidents.length / ITEMS_PER_PAGE);
  const paginatedResidents = filteredResidents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };
  const handleSearch = (term: string) => {
    setSearch(term);
    setCurrentPage(1);
  };
  const handleLetterChange = (letter: string) => {
    setLetterFilter(letter);
    setCurrentPage(1);
  };

  // 3. House Generation Logic
  const generateHouses = (courtName: string) => {
    if (!courtName) return [];
    const blocks = ["A", "B"];
    const numbers = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, "0"));
    const houses: string[] = [];
    blocks.forEach(block => {
      numbers.forEach(num => houses.push(`${courtName}-${block}${num}`));
    });
    return houses;
  };

  const availableHouses = generateHouses(court);
  const availableCourts = allCourts.filter(c => String(c.phase) === String(phase));

  const handleEditClick = (res: Resident) => {
    setEditingId(res.id);
    const parsedPhase = res.phase ? res.phase.replace(/[^0-9]/g, '') : "1";
    setPhase(parsedPhase || "1"); 
    setCourt(res.courtName || "");
    setHouse(res.houseNumber || "");
  };

  const handleSave = async (id: string) => {
    const result = await updateHouseNumber(id, `Phase ${phase}`, court, house);
    if (result.success) {
      setEditingId(null);
      router.refresh();
    } else {
      alert("Failed to update: " + result.error);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "ALL", label: "All Residents" },
          { id: "ASSIGNED", label: "Assigned Houses" },
          { id: "UNASSIGNED", label: "Unassigned" },
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search name or phone..." 
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          {(search || letterFilter !== "ALL") && (
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
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
              <tr>
                <th className="px-6 py-4">Resident</th>
                <th className="px-6 py-4">Phase</th>
                <th className="px-6 py-4">Court</th>
                <th className="px-6 py-4">House</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedResidents.length > 0 ? (
                paginatedResidents.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{res.name}</p>
                      <p className="text-xs text-gray-500">{res.phone}</p>
                    </td>
                    
                    {/* Phase Dropdown */}
                    <td className="px-6 py-4">
                      {editingId === res.id ? (
                        <select 
                          value={phase} 
                          onChange={e => { setPhase(e.target.value); setCourt(""); setHouse(""); }} 
                          className="border p-2 rounded w-32 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="1">Phase 1</option>
                          <option value="2">Phase 2</option>
                        </select>
                      ) : <span>{res.phase || "-"}</span>}
                    </td>

                    {/* Court Dropdown */}
                    <td className="px-6 py-4">
                      {editingId === res.id ? (
                        <select 
                          value={court} 
                          onChange={e => { setCourt(e.target.value); setHouse(""); }} 
                          className="border p-2 rounded w-40 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Select Court ({availableCourts.length})</option>
                          {availableCourts.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      ) : <span>{res.courtName || "-"}</span>}
                    </td>

                    {/* House Dropdown */}
                    <td className="px-6 py-4">
                      {editingId === res.id ? (
                        <select 
                          value={house} 
                          onChange={e => setHouse(e.target.value)} 
                          disabled={!court}
                          className="border p-2 rounded w-40 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
                        >
                          <option value="">Select House</option>
                          {availableHouses.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      ) : <span className="font-bold text-blue-600">{res.houseNumber || "Unassigned"}</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {editingId === res.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs font-bold px-2">Cancel</button>
                          <button onClick={() => handleSave(res.id)} disabled={!house} className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50">
                            <Save size={16}/>
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => handleEditClick(res)} className="bg-gray-100 text-gray-600 p-2 rounded hover:bg-gray-200">
                          <Edit2 size={16}/>
                        </button>
                      )}
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