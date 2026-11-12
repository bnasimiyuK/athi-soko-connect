"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createBooking } from "./actions"; // <-- SINGLE DOT HERE
import { useRouter } from "next/navigation";

export default function BookingModal({ 
  provider, 
  residentName, 
  residentPhone 
}: { 
  provider: any; 
  residentName: string; 
  residentPhone: string; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    
    // Call the server action
    const result = await createBooking({
      provider_id: provider.id,
      resident_name: residentName,
      resident_phone: residentPhone,
      service: formData.get("service") as string,
      job_date: formData.get("job_date") as string,
      job_time: formData.get("job_time") as string,
      notes: formData.get("notes") as string,
    });

    if (result.success) {
      setIsOpen(false);
      alert("Booking request sent successfully!");
      router.refresh();
    } else {
      alert("Failed to create booking: " + result.error);
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
      >
        Book Now
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h2 className="font-bold text-gray-800">Book {provider.name}</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Required</label>
                <input 
                  type="text" 
                  name="service" 
                  defaultValue={provider.services}
                  required 
                  className="w-full border border-gray-300 p-2 rounded-lg" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" name="job_date" required className="w-full border border-gray-300 p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input type="time" name="job_time" required className="w-full border border-gray-300 p-2 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea name="notes" rows={2} placeholder="Any specific instructions?" className="w-full border border-gray-300 p-2 rounded-lg resize-none"></textarea>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                {isSubmitting ? "Sending Request..." : "Confirm Booking"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}