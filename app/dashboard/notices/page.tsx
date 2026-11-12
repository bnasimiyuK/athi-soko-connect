import { createClient } from "@/lib/supabase/server";
import { Bell, Calendar, Pin, User } from "lucide-react";

export default async function NoticesPage() {
  const supabase = await createClient();
  
  // Fetch ONLY active notices, ordered by pinned first, then newest
  const { data: notices, error } = await supabase
    .from("Notices")
    .select("*")
    .eq("active", true)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Estate Notices</h1>
        <p className="text-gray-500 mt-1">Important announcements from the management.</p>
      </div>

      <div className="space-y-4">
        {notices && notices.length > 0 ? (
          notices.map((notice: any) => (
            <div 
              key={notice.id} 
              className={`bg-white p-6 rounded-xl shadow-sm border ${
                notice.pinned ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full shrink-0 ${
                  notice.pinned ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  <Bell size={24} />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {notice.title}
                        {notice.pinned && (
                          <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                            <Pin size={12} /> PINNED
                          </span>
                        )}
                      </h3>
                      {notice.category && (
                        <span className="inline-block mt-2 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {notice.category.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mt-3 whitespace-pre-wrap">{notice.text}</p>
                  
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> {new Date(notice.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                    {notice.author_name && (
                      <span className="flex items-center gap-1">
                        <User size={14} /> {notice.author_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Bell size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg">No notices posted yet.</p>
            <p className="text-sm text-gray-400 mt-1">Check back later for estate announcements.</p>
          </div>
        )}
      </div>
    </div>
  );
}