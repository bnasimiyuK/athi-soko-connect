import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Star, Phone, ArrowRight } from "lucide-react";

export default async function BookingMarketplacePage() {
  const supabase = await createClient();

  // Fetch ONLY verified providers
  const { data: providers, error } = await supabase
    .from("Providers")
    .select(`
      id,
      name,
      bio,
      phone,
      rating,
      price_from,
      price_unit,
      Categories (label)
    `)
    .eq("verified", true) // Only show verified vendors!
    .order("name", { ascending: true });

  if (error) {
    return <div className="text-red-500 p-8">Error loading marketplace: {error.message}</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Book a Service</h1>
        <p className="text-gray-500 mt-1">Browse verified vendors in your estate and book them instantly.</p>
      </div>

      {providers?.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">No verified vendors available at the moment. Please check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers?.map((provider) => {
            // Safely handle the Categories join (which returns an array or object)
            const categoryLabel = Array.isArray(provider.Categories) 
              ? provider.Categories[0]?.label 
              : (provider.Categories as any)?.label;

            return (
              <div key={provider.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{provider.name}</h2>
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded mt-2">
                      {categoryLabel || "General Service"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-1 rounded text-sm font-bold">
                    <Star size={16} fill="currentColor" />
                    {provider.rating || "New"}
                  </div>
                </div>

                <p className="text-gray-600 text-sm flex-1 mb-4 line-clamp-3">
                  {provider.bio || "No description provided."}
                </p>

                <div className="space-y-2 text-sm text-gray-600 mb-6">
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    {provider.phone}
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-gray-400 font-normal">Price:</span>
                    KES {provider.price_from || 0} <span className="text-gray-400 font-normal">{provider.price_unit}</span>
                  </div>
                </div>

                <Link 
                  href={`/dashboard/bookings/${provider.id}`}
                  className="w-full bg-blue-600 text-white text-center font-bold py-3 rounded-lg hover:bg-blue-700 transition flex justify-center items-center gap-2"
                >
                  Book Now <ArrowRight size={18} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}