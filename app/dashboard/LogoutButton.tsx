"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })} // <-- Changed to "/"
      className="flex items-center gap-3 w-full px-4 py-3 text-red-500 rounded-lg hover:bg-red-50 transition"
    >
      <LogOut size={20} />
      <span className="font-medium">Logout</span>
    </button>
  );
}