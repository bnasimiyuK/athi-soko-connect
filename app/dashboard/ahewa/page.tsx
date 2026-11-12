export const instant = false; // <-- FIXED: Stops the Next.js caching error

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  HeartHandshake,
  PenTool,
  Calendar,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AhewaPayButton from "./AhewaPayButton";
import PhotoUpload from "./PhotoUpload";

const EVENTS_PER_PAGE = 4;
const CONTRIBUTIONS_PER_PAGE = 5;

type Params = {
  esort?: string;
  epage?: string;
  csort?: string;
  cpage?: string;
  ctab?: string;
};

const EVENT_SORTS: Record<string, string> = {
  date_desc: "Newest",
  date_asc: "Oldest",
  title_asc: "A–Z",
  title_desc: "Z–A",
  amount_asc: "Amount ↑",
  amount_desc: "Amount ↓",
};

const CONTRIB_SORTS: Record<string, string> = {
  newest: "Newest",
  oldest: "Oldest",
  amount_desc: "Amount ↓",
  amount_asc: "Amount ↑",
  title_asc: "A–Z",
};

const isPaid = (status: unknown) => {
  const s = String(status ?? "").toUpperCase();
  return s === "PAID" || s === "COMPLETED";
};

// Build a link that changes some params and keeps the rest
function href(current: Params, changes: Params) {
  const merged: Record<string, string | undefined> = { ...current, ...changes };
  const qs = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `/dashboard/ahewa?${s}` : "/dashboard/ahewa";
}

function Pager({
  page,
  totalPages,
  prevHref,
  nextHref,
}: {
  page: number;
  totalPages: number;
  prevHref: string;
  nextHref: string;
}) {
  if (totalPages <= 1) return null;
  const btn =
    "flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50";
  const off = "pointer-events-none opacity-50";
  return (
    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
      <Link href={prevHref} scroll={false} className={`${btn} ${page === 1 ? off : ""}`}>
        <ChevronLeft size={16} /> Prev
      </Link>
      <span className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </span>
      <Link
        href={nextHref}
        scroll={false}
        className={`${btn} ${page === totalPages ? off : ""}`}
      >
        Next <ChevronRight size={16} />
      </Link>
    </div>
  );
}

export default async function AhewaPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const params = await searchParams;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!dbUser || !dbUser.phone) redirect("/login");

  const supabase = await createClient();

  // 1. Resident's integer ID from Supabase
  const { data: resident } = await supabase
    .from("Residents")
    .select("id, full_name")
    .eq("phone", dbUser.phone)
    .single();
  const residentId = resident?.id;

  // 2. Data from the AHEWA tables
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
    .eq("is_closed", false);

  const { data: photos } = await supabase
    .from("AhewaEventPhotos")
    .select("*")
    .eq("is_deleted", false);

  const { data: contributions } = residentId
    ? await supabase
        .from("AhewaContributions")
        .select(`*, AhewaEvents(event_title)`)
        .eq("resident_id", residentId)
    : { data: [] };

  const { data: signatories } = await supabase
    .from("AhewaSignatories")
    .select("*");

  const getPhotoUrl = (filePath: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ahewa-photos/${filePath}`;

  // ---------- EVENTS: sort + paginate ----------
  const esort = params.esort && EVENT_SORTS[params.esort] ? params.esort : "date_desc";
  const eTitle = (e: any) => String(e.event_title ?? "");
  const eDate = (e: any) => (e.event_date ? new Date(e.event_date).getTime() : 0);
  const eAmount = (e: any) => Number(e.contribution_amount || 0);

  const sortedEvents = [...(events ?? [])].sort((a, b) => {
    switch (esort) {
      case "date_asc":
        return eDate(a) - eDate(b);
      case "title_asc":
        return eTitle(a).localeCompare(eTitle(b), undefined, { numeric: true });
      case "title_desc":
        return eTitle(b).localeCompare(eTitle(a), undefined, { numeric: true });
      case "amount_asc":
        return eAmount(a) - eAmount(b);
      case "amount_desc":
        return eAmount(b) - eAmount(a);
      default:
        return eDate(b) - eDate(a);
    }
  });

  const eTotalPages = Math.max(1, Math.ceil(sortedEvents.length / EVENTS_PER_PAGE));
  const ePage = Math.min(Math.max(1, Number(params.epage) || 1), eTotalPages);
  const pageEvents = sortedEvents.slice(
    (ePage - 1) * EVENTS_PER_PAGE,
    ePage * EVENTS_PER_PAGE
  );

  // ---------- CONTRIBUTIONS: filter + sort + paginate ----------
  const ctab = ["all", "unpaid", "paid"].includes(params.ctab ?? "") ? params.ctab! : "all";
  const csort = params.csort && CONTRIB_SORTS[params.csort] ? params.csort : "newest";
  const cTitle = (c: any) => c.AhewaEvents?.event_title || "General Fund";
  const cTime = (c: any) => (c.created_at ? new Date(c.created_at).getTime() : 0);
  const cAmount = (c: any) => Number(c.amount_due || 0);

  const filteredContribs = (contributions ?? []).filter((c: any) => {
    if (ctab === "all") return true;
    return ctab === "paid" ? isPaid(c.status) : !isPaid(c.status); // unpaid includes PENDING
  });

  const sortedContribs = [...filteredContribs].sort((a: any, b: any) => {
    switch (csort) {
      case "oldest":
        return cTime(a) - cTime(b);
      case "amount_desc":
        return cAmount(b) - cAmount(a);
      case "amount_asc":
        return cAmount(a) - cAmount(b);
      case "title_asc":
        return cTitle(a).localeCompare(cTitle(b), undefined, { numeric: true });
      default:
        return cTime(b) - cTime(a);
    }
  });

  const cTotalPages = Math.max(1, Math.ceil(sortedContribs.length / CONTRIBUTIONS_PER_PAGE));
  const cPage = Math.min(Math.max(1, Number(params.cpage) || 1), cTotalPages);
  const pageContribs = sortedContribs.slice(
    (cPage - 1) * CONTRIBUTIONS_PER_PAGE,
    cPage * CONTRIBUTIONS_PER_PAGE
  );

  const pill = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-xs font-bold transition ${
      active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">AHEWA Fund</h1>
        <p className="text-slate-500 mt-1">Community welfare, events, and contributions.</p>
      </div>

      {/* Top status & general payment */}
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
        {/* LEFT: EVENTS */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col gap-3 mb-6 border-b pb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={20} className="text-teal-500" /> Active AHEWA Events
                <span className="text-xs font-medium text-slate-400">
                  ({sortedEvents.length})
                </span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Sort:</span>
                {Object.entries(EVENT_SORTS).map(([key, label]) => (
                  <Link
                    key={key}
                    href={href(params, { esort: key, epage: undefined })}
                    scroll={false}
                    className={pill(esort === key)}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {pageEvents.length > 0 ? (
                pageEvents.map((event: any) => {
                  const eventPhotos = (photos ?? []).filter(
                    (p: any) => p.event_id === event.id
                  );
                  return (
                    <div
                      key={event.id}
                      className="border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
                    >
                      <div className="bg-slate-50 p-4 border-b border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <ImageIcon size={16} /> Event Gallery ({eventPhotos.length})
                          </h5>
                          <PhotoUpload eventId={event.id} />
                        </div>
                        {eventPhotos.length > 0 ? (
                          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                            {eventPhotos.map((photo: any) => (
                              <div key={photo.id} className="shrink-0 w-40 snap-start group">
                                <div className="relative h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-200">
                                  <img
                                    src={getPhotoUrl(photo.file_path)}
                                    alt={photo.caption || "Event photo"}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                                {photo.caption && (
                                  <p className="text-[10px] text-slate-500 mt-1 truncate">
                                    {photo.caption}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            No photos uploaded yet. Be the first!
                          </p>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="font-bold text-slate-800 text-lg">
                            {event.event_title}
                          </h4>
                          <span className="text-xs font-bold bg-teal-50 text-teal-700 px-2 py-1 rounded-full uppercase shrink-0">
                            {event.event_type}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-slate-600">{event.description}</p>
                        )}
                        <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                          <div className="text-sm font-medium text-slate-500">
                            <p className="flex items-center gap-1">
                              <Calendar size={14} /> {event.event_date}
                            </p>
                            <p className="mt-2 text-slate-700">
                              Target:{" "}
                              <span className="font-bold text-teal-600">
                                KES {event.contribution_amount}
                              </span>
                            </p>
                          </div>
                          {event.contribution_amount > 0 && (
                            <div className="w-40">
                              <AhewaPayButton
                                amount={event.contribution_amount}
                                reference={`AHEWA-${event.id}`}
                                eventId={event.id}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-slate-500 py-6">No active events found.</p>
              )}
            </div>

            <Pager
              page={ePage}
              totalPages={eTotalPages}
              prevHref={href(params, { epage: String(Math.max(1, ePage - 1)) })}
              nextHref={href(params, { epage: String(Math.min(eTotalPages, ePage + 1)) })}
            />
          </div>
        </div>

        {/* RIGHT: CONTRIBUTIONS + SIGNATORIES */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-teal-500" /> My Contributions
            </h3>

            <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
              {["all", "unpaid", "paid"].map((tab) => (
                <Link
                  key={tab}
                  href={href(params, { ctab: tab, cpage: undefined })}
                  scroll={false}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md uppercase transition ${
                    ctab === tab
                      ? "bg-white text-teal-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {Object.entries(CONTRIB_SORTS).map(([key, label]) => (
                <Link
                  key={key}
                  href={href(params, { csort: key, cpage: undefined })}
                  scroll={false}
                  className={pill(csort === key)}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="space-y-3">
              {pageContribs.length > 0 ? (
                pageContribs.map((c: any) => {
                  const status = String(c.status ?? "").toUpperCase();
                  return (
                    <div
                      key={c.id}
                      className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50"
                    >
                      <div className="pr-2 min-w-0">
                        <p className="font-bold text-sm text-slate-800 line-clamp-1">
                          {cTitle(c)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Paid: KES {Number(c.amount_paid || 0).toLocaleString()}
                          {c.amount_due
                            ? ` of ${Number(c.amount_due).toLocaleString()}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded uppercase shrink-0 tracking-wider ${
                          isPaid(status)
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-slate-500 text-sm py-4">
                  No contributions found.
                </p>
              )}
            </div>

            <Pager
              page={cPage}
              totalPages={cTotalPages}
              prevHref={href(params, { cpage: String(Math.max(1, cPage - 1)) })}
              nextHref={href(params, { cpage: String(Math.min(cTotalPages, cPage + 1)) })}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <PenTool size={20} className="text-teal-500" /> Fund Signatories
            </h3>
            <div className="space-y-2">
              {signatories && signatories.length > 0 ? (
                signatories.map((sig: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
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