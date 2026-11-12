"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking } from "../actions";
import { Calendar, Clock, FileText, CheckCircle } from "lucide-react";

export default function BookingForm({ 
  providerId, 
  residentName, 
  residentPhone 
}: { 
  providerId: number; 
  residentName: string; 
  residentPhone: string; 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    const result = await createBooking({
      provider_id: providerId,
      resident_name: residentName,
      resident_phone: residentPhone,
      service: formData.get("service") as string,
      job_date: formData.get("job_date") as string,
      job_time: formData.get("job_time") as string,
      notes: formData.get("notes") as string,
    });

    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/my-bookings"); // Redirect after success
      }, 2000);
    } else {
      alert("Failed to create booking: " + result.error);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Request Sent!</h2>
        <p className="text-gray-500">The vendor will review your request shortly.</p>
        <p className="text-sm text-gray-400 mt-4">Redirecting to your bookings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service Required</label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
          <input 
            type="text" 
            name="service" 
            required 
            placeholder="e.g., Fix leaking sink, Clean 2-bedroom house"
            className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="date" name="job_date" required className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <div className="relative">
            <Clock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input type="time" name="job_time" required className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes (Optional)</label>
        <textarea 
          name="notes" 
          rows={3} 
          placeholder="Provide any specific instructions or landmarks..." 
          className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        ></textarea>
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
      >
        {isSubmitting ? "Sending Request..." : "Confirm Booking Request"}
      </button>
    </form>
  );
}