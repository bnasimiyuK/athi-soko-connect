import { createClient } from "@/lib/supabase/server";
import { Tags } from "lucide-react";
import { addCategory } from "./actions";
import CategoryTable from "./CategoryTable"; // <-- Import the new client component

export default async function AdminCategoriesPage() {
  const supabase = await createClient();

  // Fetch categories and order them alphabetically
  const { data: categories, error } = await supabase
    .from("Categories")
    .select("*")
    .order("label", { ascending: true });

  if (error) {
    return <div className="p-8 text-red-500">Error loading categories: {error.message}</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Manage Categories</h1>
        <p className="text-gray-500 mt-1">Define the service types vendors can offer to residents.</p>
      </div>

      {/* Add Category Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Tags className="text-gray-400" size={20} /> Add New Category
        </h2>
        <form action={async (formData) => {
          "use server";
          await addCategory(formData);
        }} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            name="label"
            placeholder="e.g., Plumbing, Cleaning, Electrical..."
            required
            className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-lg transition"
          >
            Add Category
          </button>
        </form>
      </div>

      {/* Render the interactive, filtered table */}
      <CategoryTable categories={categories || []} />
    </div>
  );
}