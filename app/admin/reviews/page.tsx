import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import ReviewTable from "./ReviewTable";

export default async function AdminReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");
  
  const role = String((session.user as any).role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/login");

  const supabase = await createClient();
  
  // Fetch all reviews
  const { data: reviews } = await supabase
    .from("Reviews")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Star className="text-yellow-500" size={32} /> All Platform Reviews
        </h1>
        <p className="text-gray-500 mt-1">Monitor and moderate feedback left by residents.</p>
      </div>

      <ReviewTable reviews={reviews || []} />
    </div>
  );
}