"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import DeleteButton from "./DeleteButton";

type Category = {
  id: number;
  label: string;
};

export default function CategoryTable({ categories }: { categories: Category[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [letterFilter, setLetterFilter] = useState("ALL");

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Filter logic
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const searchMatch = category.label.toLowerCase().includes(searchTerm.toLowerCase());
      const firstLetter = category.label.charAt(0).toUpperCase();
      const letterMatch = letterFilter === "ALL" || firstLetter === letterFilter;

      return searchMatch && letterMatch;
    });
  }, [categories, searchTerm, letterFilter]);

  // Group by first letter
  const groupedCategories = useMemo(() => {
    return filteredCategories.reduce((acc, category) => {
      const letter = category.label.charAt(0).toUpperCase();
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(category);
      return acc;
    }, {} as Record<string, Category[]>);
  }, [filteredCategories]);

  const sortedLetters = Object.keys(groupedCategories).sort();

  return (
    <div className="space-y-4">
      
      {/* 🧹 CLEAN FILTER BAR */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {(searchTerm || letterFilter !== "ALL") && (
            <button 
              onClick={() => { setSearchTerm(""); setLetterFilter("ALL"); }}
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
            onClick={() => setLetterFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              letterFilter === "ALL" 
                ? "bg-purple-600 text-white shadow-sm" 
                : "bg-gray-50 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ALL
          </button>
          {alphabet.map((letter) => (
            <button
              key={letter}
              onClick={() => setLetterFilter(letter)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition ${
                letterFilter === letter 
                  ? "bg-purple-600 text-white shadow-sm" 
                  : "bg-gray-50 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* 📊 RESULTS LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
          {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'} found
        </div>
        
        <div className="p-6 space-y-8">
          {sortedLetters.length > 0 ? (
            sortedLetters.map((letter) => (
              <div key={letter}>
                {/* Letter Header */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold text-sm">
                    {letter}
                  </span>
                  <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                {/* Categories under this letter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                  {groupedCategories[letter].map((category) => (
                    <div key={category.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition">
                      <span className="font-medium text-gray-700">{category.label}</span>
                      <DeleteButton id={category.id} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No categories match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}