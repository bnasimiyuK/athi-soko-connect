"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Phone, Lock, Store, ArrowLeft, Briefcase } from "lucide-react";
import { registerVendor } from "./actions"; // <-- Correct import for the vendor folder

export default function VendorRegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await registerVendor(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      alert("Vendor profile created! Wait for Admin verification before you appear in the marketplace.");
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4 py-12">
      <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-md">
        <Link href="/login" className="text-gray-500 hover:text-green-600 flex items-center gap-2 text-sm font-medium mb-6 transition">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Become a Vendor</h1>
        <p className="text-gray-500 text-sm mb-6">Register your business to start receiving jobs.</p>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="text" name="name" required placeholder="Jane Doe" className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Login ID)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="tel" name="phone" required placeholder="0712345678" className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="password" name="password" required minLength={6} placeholder="••••••••" className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>

          <hr className="my-4 border-gray-100" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <div className="relative">
              <Store className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="text" name="businessName" required placeholder="e.g., Bev's Laundromart" className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Services Offered</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="text" name="services" required placeholder="e.g., Cleaning, Plumbing, Catering" className="w-full border border-gray-300 pl-10 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Price (KES)</label>
              <input type="number" name="priceFrom" required defaultValue={500} className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Unit</label>
              <select name="priceUnit" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                <option value="per hour">per hour</option>
                <option value="per day">per day</option>
                <option value="per visit">per visit</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 mt-2">
            {loading ? "Registering Business..." : "Register as Vendor"}
          </button>
        </form>
      </div>
    </main>
  );
}