"use client";

import { useState } from "react";
import { uploadEventPhoto } from "./upload-action";
import { Camera, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PhotoUpload({ eventId }: { eventId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.append("eventId", eventId.toString());

    const result = await uploadEventPhoto(formData);

    if (result.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      setError(result.error || "Upload failed");
    }
    setLoading(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition"
      >
        <Camera size={16} /> Add Photo
      </button>
    );
  }

  return (
    <div className="bg-gray-50 border border-blue-200 p-4 rounded-xl mt-4 w-full">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-gray-800">Upload Event Photo</h4>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-500">
          <X size={16} />
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <form onSubmit={handleUpload} className="space-y-3">
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <input
          type="text"
          name="caption"
          placeholder="Add a caption (optional)"
          className="w-full border border-gray-300 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {loading ? "Uploading..." : "Upload Photo"}
        </button>
      </form>
    </div>
  );
}