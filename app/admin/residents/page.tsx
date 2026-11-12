import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import ResidentTable from "./ResidentTable";

export default async function AdminResidentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");
  
  const role = String((session.user as any).role || "").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/login");

  // ✅ FIX: Explicitly type the array using Prisma's inferred type
  let residents: Awaited<ReturnType<typeof prisma.user.findMany>> = [];
  
  try {
    residents = await prisma.user.findMany({
      where: { role: "RESIDENT" },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error loading residents:", error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-blue-600" size={32} /> Residents
        </h1>
        <p className="text-gray-500 mt-1">Manage estate residents and their AHE approval status.</p>
      </div>

      <ResidentTable residents={residents} />
    </div>
  );
}