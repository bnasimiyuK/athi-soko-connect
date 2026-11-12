"use client";

import { useState, useMemo } from "react";
import { Calendar, Image as ImageIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import AhewaPayButton from "./AhewaPayButton";
import PhotoUpload from "./PhotoUpload";

const ITEMS_PER_PAGE = 4;

type SortKey = "DATE_DESC" | "DATE_ASC" | "TITLE_ASC" | "TITLE_DESC" | "AMOUNT_ASC" | "AMOUNT_DESC";

export default function AhewaEventsList({
  events,
  photos,
  getPhotoUrl,
}: {
  events: any[];
  photos: any[];
  getPhotoUrl: (path: string) => string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("DATE_DESC");
  const [currentPage, setCurrentPage] = useState(1);

  const processedEvents = useMemo(() => {
    const term = searchTerm.toLowerCase();

    const filtered = events.filter((event) => {
      const searchMatch = String(event.event_title ?? "").toLowerCase().includes(term);
      const typeMatch =
        typeFilter === "ALL" || String(event.event_type ?? "").toUpperCase() === typeFilter;
      return searchMatch && typeMatch;
    });

    const title = (e: any) => String(e.event_title ?? "");
    const date = (e: any) => (e.event_date ? new Date(e.event_date).getTime() : 0);
    const amount = (e: any) => Number(e.contribution_amount || 0);

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "DATE_ASC":
          return date(a) - date(b);
        case "TITLE_ASC":
          return title(a).localeCompare(title(b), undefined, { numeric: true });
        case "TITLE_DESC":
          return title(b).localeCompare(title(a), undefined, { numeric: true });
        case "AMOUNT_ASC":
          return amount(a) - amount(b);
        case "AMOUNT_DESC":
          return amount(b) - amount(a);
        default:
          return date(b) - date(a);
      }
    });
  }, [events, searchTerm, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(processedEvents.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginatedEvents = processedEvents.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const getEventPhotos = (eventId: number) =>
    photos?.filter((p: any) => p.event_id === eventId) || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col gap-4 mb-6 border-b pb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Calendar size={20} className="text-teal-500" /> Active AHEWA Events
        </h3>

        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded-lg text-sm px-2 py-1.5 outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="ALL">All Types</option>
            <option value="PRINCIPAL">Principal</option>
            <option value="DEPENDANT">Dependant</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortKey);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded-lg text-sm px-2 py-1.5 outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="DATE_DESC">Date: newest first</option>
            <option value="DATE_ASC">Date: oldest first</option>
            <option value="TITLE_ASC">Title: A to Z</option>
            <option value="TITLE_DESC">Title: Z to A</option>
            <option value="AMOUNT_ASC">Amount: low to high</option>
            <option value="AMOUNT_DESC">Amount: high to low</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-6">
        {paginatedEvents.length > 0 ? (
          paginatedEvents.map((event: any) => {
            const eventPhotos = getEventPhotos(event.id);

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
                              alt="Event"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No photos uploaded yet.</p>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 text-lg">{event.event_title}</h4>
                    <span className="text-xs font-bold bg-teal-50 text-teal-700 px-2 py-1 rounded-full uppercase">
                      {event.event_type}
                    </span>
                  </div>

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
                    <div className="w-40">
                      <AhewaPayButton
                        amount={event.contribution_amount}
                        reference={`AHEWA-${event.id}`}
                        eventId={event.id}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-slate-500 py-6">
            No events found matching your filters.
          </p>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}