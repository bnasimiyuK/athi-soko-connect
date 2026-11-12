import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeartHandshake, PenTool, ArrowLeft, AlertCircle } from "lucide-react";
import AhewaPayButton from "../AhewaPayButton";
import AhewaEventsList from "../AhewaEventsList";
import MyContributionsList from "../MyContributionsList";

export default async function AhewaContributionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser || !dbUser.phone) redirect("/login");

  const supabase = await createClient();

  // Resident's integer ID in Supabase (matched by phone)
  const { data: resident } = await supabase
    .from("Residents")
    .select("id")
    .eq("phone", dbUser.phone)
    .maybeSingle();

  const residentId = resident?.id;

  const { data: membership } = residentId
    ? await supabase
        .from("AhewaMembership")
        .select("*")
        .eq("resident_id", residentId)
        .maybeSingle()
    : { data: null };

  const { data: events } = await supabase
    .from("AhewaEvents")
    .select("*")
    .eq("is_closed", false)
    .order("event_date", { ascending: false });

  const { data: photos } = await supabase
    .from("AhewaEventPhotos")
    .select("*")
    .eq("is_deleted", false);

  const { data: contributions } = residentId
    ? await supabase
        .from("AhewaContributions")
        .select(`*, AhewaEvents(event_title)`)
        .eq("resident_id", residentId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: signatories } = await supabase
    .from("AhewaSignatories")
    .select("*");

  const getPhotoUrl = (filePath: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ahewa-photos/${filePath}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <Link
          href="/dashboard/ahewa"
          className="text-teal-600 hover:underline flex items-center gap-2 mb-3 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to AHEWA Fund
        </Link>
        <h1 className="text-3xl font-bold text-slate-800">AHEWA Contributions</h1>
        <p className="text-slate-500 mt-1">
          Browse, sort and page through events and your contributions.
        </p>
      </div>

      {!residentId && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>
            We couldn&apos;t find a resident profile linked to your phone number, so your
            contribution history is empty. Please contact the estate office.
          </p>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`p-4 rounded-full ${
              membership ? "bg-teal-50 text-teal-600" : "bg-slate-100 text-slate-500"
            }`}
          >
            <HeartHandshake size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {membership ? "Active AHEWA Member" : "Not a Member"}
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              {membership
                ? `Member since ${new Date(membership.created_at).toLocaleDateString()}`
                : "Join the fund to support community events and emergencies."}
            </p>
          </div>
        </div>

        <div className="w-full md:w-64">
          <p className="text-xs font-bold text-slate-500 uppercase text-center mb-1">
            General Contribution
          </p>
          <AhewaPayButton amount={100} reference="AHEWA-GENERAL" eventId={null} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: EVENTS (search, type filter, sort, pagination) */}
        <div className="lg:col-span-2">
          <AhewaEventsList
            events={events || []}
            photos={photos || []}
            getPhotoUrl={getPhotoUrl}
          />
        </div>

        {/* RIGHT COLUMN: CONTRIBUTIONS (tabs, sort, pagination) + SIGNATORIES */}
        <div className="space-y-6">
          <MyContributionsList contributions={contributions || []} />

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <PenTool size={20} className="text-teal-500" /> Fund Signatories
            </h3>
            <div className="space-y-2">
              {signatories && signatories.length > 0 ? (
                signatories.map((sig: any, idx: number) => (
                  <div key={sig.id ?? idx} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700">
                      {sig.name || "Pending Setup"}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                      {sig.role || "Signatory"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 text-sm py-2">
                  No signatories listed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}