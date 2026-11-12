import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Home } from "lucide-react";
import HouseNumberTable from "./HouseNumberTable";
import HouseNumberExportButton from "../../components/HouseNumberExportButton";

export default async function AdminHouseNumbersPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");
  
  const role = String((session.user as any).role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/login");

  // 1. Fetch Residents
  const residents = await prisma.user.findMany({
    where: { role: "RESIDENT" },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch all Courts from Supabase to pass to the table
  const supabase = await createClient();
  const { data: courts } = await supabase.from("Courts").select("id, name, phase");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Export Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Home className="text-blue-600" size={32} /> House Numbers
          </h1>
          <p className="text-gray-500 mt-1">Assign property details to approved residents.</p>
        </div>

        {/* ADD THE EXPORT BUTTON HERE */}
        <HouseNumberExportButton 
          residents={residents} 
          fileName="Estate_House_Numbers" 
        />
      </div>

      {/* Pass the courts data to the client component */}
      <HouseNumberTable residents={residents} allCourts={courts || []} />
    </div>
  );
}