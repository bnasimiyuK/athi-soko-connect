"use client";

import { useState } from "react";
import { deleteUser, updateUserRole } from "./actions";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function UserActions({ 
  user, 
  currentUserId 
}: { 
  user: { id: string; role: string; name: string | null }; 
  currentUserId: string;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const isSelf = user.id === currentUserId;

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setIsUpdating(true);
    const result = await updateUserRole(user.id, newRole);
    if (result.success) {
      router.refresh();
    } else {
      alert("Failed to update role: " + result.error);
    }
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${user.name || "this user"}?`)) return;
    
    setIsDeleting(true);
    const result = await deleteUser(user.id);
    if (result.success) {
      router.refresh();
    } else {
      alert("Failed to delete user: " + result.error);
    }
    setIsDeleting(false);
  };

  if (isSelf) {
    return <span className="text-xs text-gray-400 italic">Current Account</span>;
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {/* Role Dropdown */}
      <div className="relative">
        {isUpdating && <Loader2 size={14} className="absolute left-2 top-2.5 animate-spin text-gray-400" />}
        <select
          value={user.role.toUpperCase()}
          onChange={handleRoleChange}
          disabled={isUpdating || isDeleting}
          className={`text-xs font-medium border border-gray-300 rounded-lg py-1.5 pl-6 pr-6 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer ${
            isUpdating ? "opacity-50" : ""
          }`}
        >
          <option value="RESIDENT">RESIDENT</option>
          <option value="VENDOR">VENDOR</option>
          <option value="SECURITY">SECURITY</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      </div>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={isDeleting || isUpdating}
        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
        title="Delete User"
      >
        {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
      </button>
    </div>
  );
}