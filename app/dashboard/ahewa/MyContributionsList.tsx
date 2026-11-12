"use client";

import { useState, useMemo } from "react";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 5;

type SortKey = "NEWEST" | "OLDEST" | "AMOUNT_DESC" | "AMOUNT_ASC" | "TITLE_ASC";

const isPaid = (status: string) => status === "PAID" || status === "COMPLETED";

export default function MyContributionsList({ contributions }: { contributions: any[] }) {
  const [activeTab, setActiveTab] = useState<"ALL" | "UNPAID" | "PAID">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("NEWEST");
  const [currentPage, setCurrentPage] = useState(1);

  const getTitle = (c: any) => c.AhewaEvents?.event_title || "General Fund";
  const getTime = (c: any) => (c.created_at ? new Date(c.created_at).getTime() : 0);

  const processed = useMemo(() => {
    const filtered = contributions.filter((c) => {
      const status = String(c.status ?? "").toUpperCase();
      if (activeTab === "ALL") return true;
      if (activeTab === "PAID") return isPaid(status);
      return !isPaid(status); // UNPAID includes PENDING
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "OLDEST":
          return getTime(a) - getTime(b);
        case "AMOUNT_DESC":
          return Number(b.amount_due || 0) - Number(a.amount_due || 0);
        case "AMOUNT_ASC":
          return Number(a.amount_due || 0) - Number(b.amount_due || 0);
        case "TITLE_ASC":
          return getTitle(a).localeCompare(getTitle(b), undefined, { numeric: true });
        default:
          return getTime(b) - getTime(a);
      }
    });
  }, [contributions, activeTab, sortBy]);

  const totalPages = Math.max(1, Math.ceil(processed.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = processed.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FileText size={20} className="text-teal-500" /> My Contributions
      </h3>

      {/* TABS */}
      <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
        {(["ALL", "UNPAID", "PAID"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
              activeTab === tab
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* SORT */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <span className="text-xs text-slate-500">{processed.length} found</span>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortKey);
            setCurrentPage(1);
          }}
          className="border border-slate-300 rounded-lg text-xs px-2 py-1.5 outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="NEWEST">Newest first</option>
          <option value="OLDEST">Oldest first</option>
          <option value="AMOUNT_DESC">Amount: high to low</option>
          <option value="AMOUNT_ASC">Amount: low to high</option>
          <option value="TITLE_ASC">Title: A to Z</option>
        </select>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {pageItems.length > 0 ? (
          pageItems.map((contrib: any) => {
            const status = String(contrib.status ?? "").toUpperCase();
            return (
              <div
                key={contrib.id}
                className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50"
              >
                <div className="pr-2 min-w-0">
                  <p className="font-bold text-sm text-slate-800 line-clamp-1">
                    {getTitle(contrib)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Paid: KES {Number(contrib.amount_paid || 0).toLocaleString()}
                    {contrib.amount_due
                      ? ` of ${Number(contrib.amount_due).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded uppercase shrink-0 tracking-wider ${
                    isPaid(status)
                      ? "bg-green-100 text-green-700"
                      : status === "UNPAID" || status === "PENDING"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-slate-200 text-slate-700"
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

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-xs text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}