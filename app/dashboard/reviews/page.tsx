import { createClient } from "@/lib/supabase/server";
import { Star } from "lucide-react";

export default async function ReviewsPage() {
  const supabase = await createClient();
  const { data: reviews } = await supabase.from("Reviews").select("*").order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">My Reviews</h1>
        <p className="text-gray-500 mt-1">Feedback you've left for vendors.</p>
      </div>
      <div className="space-y-4">
        {reviews?.map((review: any) => (
          <div key={review.id} className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-center gap-1 text-yellow-500 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill={i < review.rating ? "currentColor" : "none"} />)}
            </div>
            <p className="text-gray-700 italic">"{review.comment}"</p>
          </div>
        ))}
        {(!reviews || reviews.length === 0) && <p className="text-gray-500">No reviews yet.</p>}
      </div>
    </div>
  );
}