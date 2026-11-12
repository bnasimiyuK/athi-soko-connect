import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Calendar, Clock, Users, PlusCircle, CheckCircle2 } from "lucide-react";
import { createVisitorPass } from "./actions";

export default async function ResidentVisitorsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser) redirect("/login");

  const supabase = await createClient();

  // Fetch this resident's created visitor passes
  const { data: passes } = await supabase
    .from("visitor_groups")
    .select("*")
    .eq("house_number", dbUser.houseNumber || "Unknown")
    .order("visit_date", { ascending: false });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Visitor Management</h1>
        <p className="text-gray-500 mt-1">Pre-approve guests and generate gate pass codes for security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* CREATE PASS FORM */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-blue-600" /> Invite a Guest
          </h2>
          
          <form action={async (formData) => {
            "use server";
            await createVisitorPass(formData);
          }} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visitor Name</label>
              <input type="text" name="visitorName" required placeholder="e.g., John Doe" className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Visit</label>
              <input type="date" name="visitDate" required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Time</label>
              <input type="time" name="expectedTime" required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <input type="text" name="purpose" required placeholder="e.g., Family visit" className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">
              Generate Gate Pass
            </button>
          </form>
        </div>

        {/* LIST OF PASSES */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Your Active Passes</h2>
          
          {passes && passes.length > 0 ? (
            passes.map((pass: any) => (
              <div key={pass.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900">Pass Code: <span className="font-mono text-blue-600 tracking-widest">{pass.access_code}</span></h3>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full uppercase">{pass.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {pass.visit_date}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {pass.expected_time}</span>
                    <span className="flex items-center gap-1"><Users size={14} /> {pass.headcount} Guest(s)</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 italic">"{pass.purpose}"</p>
                </div>
                <CheckCircle2 size={32} className="text-green-500 opacity-20" />
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-xl border-2 border-dashed border-gray-300 text-center">
              <p className="text-gray-500">You have not invited any visitors yet.</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}