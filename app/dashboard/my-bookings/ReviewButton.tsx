"use client";

import { useState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import { submitReview } from "./actions";
import { useRouter } from "next/navigation";

export default function ReviewButton({ bookingId, providerId }: { bookingId: number, providerId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rating === 0) return alert("Please select a star rating.");

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("bookingId", bookingId.toString());
    formData.append("providerId", providerId.toString());
    formData.append("rating", rating.toString());

    const result = await submitReview(formData);

    if (result.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 px-3 py-1.5 rounded-lg text-sm font-bold transition"
      >
        <Star size={16} fill="currentColor" /> Leave Review
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
              <h2 className="font-bold text-slate-800">Rate Your Experience</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(rating)}
                    className="text-4xl transition-colors"
                  >
                    <Star 
                      size={40} 
                      fill={(hover || rating) >= star ? "currentColor" : "none"} 
                      className={(hover || rating) >= star ? "text-yellow-500" : "text-slate-300"}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comment (Optional)</label>
                <textarea 
                  name="comment" 
                  rows={3} 
                  placeholder="How was the service?" 
                  className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-lg transition flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}