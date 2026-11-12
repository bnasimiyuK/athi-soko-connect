"use client";

import { useState } from "react";
import { PlusCircle, MapPin } from "lucide-react";
import { addOffering } from "./actions";

type Category = { id: number; label: string };
type Court = { id: number; name: string; phase: number };

export default function AddServiceForm({ 
  categories, 
  courts 
}: { 
  categories: Category[]; 
  courts: Court[]; 
}) {
  const [selectedPhase, setSelectedPhase] = useState("");
  
  // Filter courts based on selected phase
  const availableCourts = courts.filter(c => String(c.phase) === selectedPhase);

  return (
    <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <PlusCircle size={20} className="text-teal-600" /> Add a Service
      </h2>
      
      <form action={async (formData) => {
        const res = await addOffering(formData);
        if (!res.success) alert(res.error);
        else {
          // Reset form on success
          (document.getElementById("add-service-form") as HTMLFormElement)?.reset();
          setSelectedPhase("");
        }
      }} id="add-service-form" className="space-y-4">
        
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select name="category_id" required className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white">
            <option value="">Select a category...</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Service Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Service Package Name</label>
          <input type="text" name="title" required placeholder="e.g., Deep Cleaning" className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        
        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Starting Price (KES)</label>
          <input type="number" name="price" required placeholder="2000" className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        
        {/* Price Unit */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Price Unit</label>
          <select name="price_unit" className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white">
            <option value="per hour">per hour</option>
            <option value="per day">per day</option>
            <option value="per visit">per visit</option>
            <option value="per item">per item</option>
          </select>
        </div>

        {/* Location */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1">Location (Area)</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
            <input type="text" name="location" placeholder="e.g., Near Gate 2" className="w-full border border-slate-300 pl-10 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>

        {/* Phase & Court */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phase</label>
            <select 
              name="phase" 
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">Any</option>
              <option value="1">Phase 1</option>
              <option value="2">Phase 2</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Court</label>
            <select 
              name="court" 
              disabled={!selectedPhase}
              className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{selectedPhase ? "Select Court" : "Select Phase first"}</option>
              {availableCourts.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Availability */}
        <div className="pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
            <input type="checkbox" name="is_available" defaultChecked className="w-5 h-5 text-teal-600 rounded cursor-pointer" />
            Currently Available for Bookings
          </label>
        </div>
        
        <button type="submit" className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-lg transition mt-4">
          Add Package
        </button>
      </form>
    </div>
  );
}