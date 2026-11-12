import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import VendorTable from "./VendorTable";

export default async function AdminVendorsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const supabase = await createClient();

  // Fetch all vendors
  const { data: vendors, error } = await supabase
    .from("Providers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return <div className="p-8 text-red-500">Error loading vendors: {error.message}</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Store className="text-green-600" size={32} /> Vendors & Providers
        </h1>
        <p className="text-gray-500 mt-1">Manage all registered service providers in the estate.</p>
      </div>

      {/* Pass data to the interactive table */}
      <VendorTable vendors={vendors || []} />
    </div>
  );
}