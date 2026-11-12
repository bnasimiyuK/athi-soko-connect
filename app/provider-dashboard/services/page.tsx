export const instant = false;

import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Package, Trash2, MapPin } from "lucide-react";
import { deleteOffering } from "./actions";
import AddServiceForm from "./AddServiceForm"; // <-- Import the new client component

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return "";
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.substring(1);
  return p;
}

export default async function ProviderServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser || !dbUser.phone) redirect("/login");

  const supabase = await createClient();
  
  // 1. Fetch Categories AND Courts from backend
  const { data: categories } = await supabase.from("Categories").select("id, label").order("label");
  const { data: courts } = await supabase.from("Courts").select("id, name, phase").order("name");

  // 2. Fetch Provider
  const { data: providers } = await supabase.from("Providers").select("id, phone");
  const provider = providers?.find(p => normalizePhone(p.phone) === normalizePhone(dbUser.phone));

  // 3. Fetch Offerings
  const { data: offerings } = provider ? await supabase
    .from("ProviderOfferings")
    .select("*")
    .eq("provider_id", provider.id)
    .order("created_at", { ascending: false }) : { data: [] };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">My Services</h1>
        <p className="text-slate-500 mt-1">Add specific packages, prices, and availability for residents to book.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Pass data to the new interactive form */}
        <AddServiceForm 
          categories={categories || []} 
          courts={courts || []} 
        />

        {/* List of current services */}
        <div className="md:col-span-2 space-y-4">
          {offerings && offerings.length > 0 ? (
            offerings.map((offer: any) => (
              <div key={offer.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-slate-900">{offer.services}</h3>
                    {offer.is_available ? (
                      <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Available</span>
                    ) : (
                      <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Unavailable</span>
                    )}
                  </div>
                  
                  <p className="font-bold text-teal-700 mt-2 text-lg">
                    KES {Number(offer.price_from).toLocaleString()} <span className="text-sm text-slate-500 font-normal">{offer.price_unit}</span>
                  </p>

                  {(offer.location || offer.phase || offer.court) && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-2">
                      <MapPin size={14} />
                      <span>
                        {[offer.location, offer.phase ? `Phase ${offer.phase}` : null, offer.court].filter(Boolean).join(" • ")}
                      </span>
                    </div>
                  )}
                </div>
                
                <form action={async () => {
                  "use server";
                  await deleteOffering(offer.id);
                }}>
                  <button type="submit" className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition mt-1">
                    <Trash2 size={20} />
                  </button>
                </form>
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-xl border-2 border-dashed border-slate-300 text-center">
              <Package size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">You haven't added any specific service packages yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}