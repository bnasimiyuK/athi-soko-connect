import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Calendar,
  Image as ImageIcon,
  ArrowLeft,
  Wallet,
  CheckCircle2,
  Download,
  PenTool,
} from "lucide-react";
import Link from "next/link";
import PhotoUpload from "../PhotoUpload";
import ApproveButton from "../ApproveButton";

const REQUIRED_APPROVALS = 3;

export default async function AhewaEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const eventId = Number(resolvedParams.id);
  if (!eventId) notFound();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const role = String(session.user.role || "").toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("AhewaEvents")
    .select("*")
    .eq("id", eventId)
    .single();
  if (!event) notFound();

  const { data: photos } = await supabase
    .from("AhewaEventPhotos")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_deleted", false);

  const { data: contributions } = await supabase
    .from("AhewaContributions")
    .select("amount_paid")
    .eq("event_id", eventId);
  const totalCollected =
    contributions?.reduce((sum, c) => sum + (c.amount_paid || 0), 0) || 0;

  // Approvals and signatories
  const { data: approvals } = await supabase
    .from("AhewaDisbursementApprovals")
    .select("*")
    .eq("event_id", eventId);
  const { data: signatories } = await supabase
    .from("AhewaSignatories")
    .select("*");

  const approvalCount = new Set((approvals ?? []).map((a) => a.signatory_id)).size;

  const targetAmount = event.contribution_amount || 0;
  const progressPercent =
    targetAmount > 0
      ? Math.min((totalCollected / (targetAmount * 10)) * 100, 100) // Rough estimate
      : 0;

  const getPhotoUrl = (filePath: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ahewa-photos/${filePath}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/dashboard/ahewa"
        className="text-blue-600 hover:underline flex items-center gap-2 mb-4 font-medium"
      >
        <ArrowLeft size={16} /> Back to AHEWA Fund
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-8 text-white">
          <h1 className="text-3xl font-bold">{event.event_title}</h1>
          <p className="text-blue-100 mt-2">{event.description}</p>
          <div className="mt-4 flex gap-6 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Calendar size={18} /> {event.event_date}
            </span>
            <span className="flex items-center gap-2">
              <Wallet size={18} /> Target: KES {targetAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Financials & Approvals */}
        <div className="p-6 space-y-6">
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-gray-800">
                Collected: KES {totalCollected.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-green-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Signatory Co-Authorization Panel */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <PenTool size={20} className="text-purple-600" /> Disbursement
                Co-Authorization
              </h3>
              <span className="text-sm font-medium text-gray-500">
                {approvalCount} of {REQUIRED_APPROVALS} approved
              </span>
            </div>

            {event.is_disbursed && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm font-bold text-green-700 flex items-center gap-2">
                <CheckCircle2 size={16} /> Funds disbursed
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {signatories?.map((sig: any) => {
                const hasApproved = approvals?.some(
                  (a) => a.signatory_id === sig.id
                );
                return (
                  <div
                    key={sig.id}
                    className={`p-4 rounded-xl border ${
                      hasApproved
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <p className="font-bold text-gray-800">{sig.name}</p>
                    <p className="text-xs text-gray-500 mb-3">{sig.role}</p>
                    {hasApproved ? (
                      <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                        <CheckCircle2 size={16} /> Approved
                      </span>
                    ) : event.is_disbursed ? (
                      <span className="text-sm text-gray-400">Closed</span>
                    ) : (
                      <ApproveButton eventId={eventId} signatoryId={sig.id} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin Exports */}
          {isAdmin && (
            <div className="border-t pt-6 flex gap-4">
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                <Download size={18} /> Export Excel
              </button>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                <Download size={18} /> Export PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon size={24} className="text-blue-500" /> Event Gallery (
            {photos?.length || 0})
          </h2>
          <PhotoUpload eventId={event.id} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos?.map((photo) => (
            <div
              key={photo.id}
              className="relative rounded-xl overflow-hidden aspect-square border"
            >
              <img
                src={getPhotoUrl(photo.file_path)}
                alt="Event"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}