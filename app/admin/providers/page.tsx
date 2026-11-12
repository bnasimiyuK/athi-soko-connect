import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CheckCircle, XCircle } from "lucide-react";

export default async function ManageProvidersPage() {
  const supabase = await createClient();

  // Fetch all providers and join with their Categories
  const { data: providers, error } = await supabase
    .from("Providers")
    .select(`
      *,
      Categories (label)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="text-red-500">Error loading providers: {error.message}</div>;
  }

  // Server Action to toggle vendor verification
  const toggleVerification = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    const currentStatus = formData.get("currentStatus") === "true";
    
    const supabaseServer = await createClient();
    await supabaseServer
      .from("Providers")
      .update({ verified: !currentStatus })
      .eq("id", id);
      
    revalidatePath("/admin/providers");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Vendors & Providers</h1>
        <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-sm font-bold">
          Total: {providers?.length || 0}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                <th className="p-4 font-semibold">Business Name</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers?.map((provider) => (
                <tr key={provider.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-4 text-gray-800 font-medium">
                    {provider.name}
                    <div className="text-xs text-gray-500 font-normal mt-1">
                      Joined: {new Date(provider.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">
                    {/* @ts-ignore - Ignoring join type error */}
                    {provider.Categories?.label || "General Service"}
                  </td>
                  <td className="p-4 text-gray-600 text-sm">
                    {provider.phone}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      provider.verified 
                        ? "bg-green-100 text-green-700" 
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {provider.verified ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {provider.verified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <form action={toggleVerification}>
                      <input type="hidden" name="id" value={provider.id} />
                      <input type="hidden" name="currentStatus" value={provider.verified ? "true" : "false"} />
                      <button 
                        type="submit"
                        className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
                          provider.verified 
                            ? "text-red-600 bg-red-50 hover:bg-red-100" 
                            : "text-white bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {provider.verified ? "Revoke Verification" : "Verify Vendor"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              
              {providers?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No vendors found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}