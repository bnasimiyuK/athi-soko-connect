import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Because our Supabase server client uses cookies(), 
  // Next.js automatically knows this page must be dynamic.
  const supabase = await createClient();

  // Fetch providers and join with Categories
  const { data: providers, error } = await supabase
    .from("Providers")
    .select(`
      id, 
      name, 
      bio, 
      phone, 
      rating, 
      Categories (label)
    `)
    .limit(6);

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Athi Soko Connect Providers</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
          <b>Error loading data:</b> {error.message}
        </div>
      )}

      {!providers?.length && !error && (
        <p className="text-gray-500">No providers found. Did you enable RLS policies?</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {providers?.map((provider) => (
          <div key={provider.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
            <h2 className="text-xl font-bold text-gray-900">{provider.name}</h2>
            
            {/* @ts-ignore - Ignoring strict type check for joined table */}
            <p className="text-sm font-medium text-blue-600 mb-2">
              {/* @ts-ignore */}
              {provider.Categories?.label || "General Service"}
            </p>
            
            <p className="text-gray-600 line-clamp-3 mb-4">
              {provider.bio || "No bio provided."}
            </p>
            
            <div className="flex justify-between items-center text-sm border-t pt-4">
              <span className="font-semibold text-gray-700">⭐ {provider.rating || "New"}</span>
              <span className="text-gray-500">📞 {provider.phone}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}