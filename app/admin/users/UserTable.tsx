"use client";

import { useState, useMemo } from "react";
import { User, Phone, Shield, Store, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import UserActions from "./UserActions";

type UserType = {
  id: string;
  name: string | null;
  phone: string;
  role: string;
  createdAt: Date;
  mpesaCode?: string | null;
  aheStatus?: string;
};

const ITEMS_PER_PAGE = 10;

export default function UserTable({ 
  users, 
  currentUserId 
}: { 
  users: UserType[]; 
  currentUserId: string; 
}) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [letterFilter, setLetterFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // 1. Filter Logic
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Tab Filter
      const roleUpper = user.role.toUpperCase();
      let tabMatch = true;
      if (activeTab === "RESIDENTS") tabMatch = roleUpper === "RESIDENT";
      if (activeTab === "VENDORS") tabMatch = roleUpper === "VENDOR";
      if (activeTab === "STAFF") tabMatch = ["ADMIN", "SUPER_ADMIN", "SECURITY"].includes(roleUpper);

      // Search Filter
      const searchMatch = 
        (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        user.phone.includes(searchTerm);

      // Letter Filter
      const firstLetter = user.name ? user.name.charAt(0).toUpperCase() : "";
      const letterMatch = letterFilter === "ALL" || firstLetter === letterFilter;

      return tabMatch && searchMatch && letterMatch;
    });
  }, [users, activeTab, searchTerm, letterFilter]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page to 1 when filters change
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

  const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
      case "ADMIN":
      case "SUPER_ADMIN":
        return <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold"><Shield size={12}/> {role}</span>;
      case "VENDOR":
        return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold"><Store size={12}/> VENDOR</span>;
      case "SECURITY":
        return <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold"><Shield size={12}/> SECURITY</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold"><User size={12}/> RESIDENT</span>;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "ALL", label: "All Users" },
          { id: "RESIDENTS", label: "Residents" },
          { id: "VENDORS", label: "Vendors" },
          { id: "STAFF", label: "Admins & Staff" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === tab.id 
                ? "border-purple-600 text-purple-700 bg-purple-50/50" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 🧹 FILTER BAR */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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
        <div className="p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 flex justify-between items-center">
          <span>Showing {paginatedUsers.length} of {filteredUsers.length} users</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone / Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Date Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center font-bold">{user.name?.charAt(0) || "U"}</div>
                        <p className="font-bold text-gray-900">{user.name || "Unnamed User"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" /> {user.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">
                      {new Date(user.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <UserActions user={user} currentUserId={currentUserId} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No users found matching your filters.
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
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}