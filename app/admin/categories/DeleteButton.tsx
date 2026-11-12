"use client";

import { useState } from "react";
import { deleteCategory } from "./actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeleteButton({ id }: { id: number }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this category? Vendors in this category may lose their tag.")) return;
    
    setIsDeleting(true);
    const result = await deleteCategory(id);
    if (result.success) {
      router.refresh();
    } else {
      alert("Failed to delete: " + result.error);
    }
    setIsDeleting(false);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
      title="Delete Category"
    >
      <Trash2 size={18} />
    </button>
  );
}