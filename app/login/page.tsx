"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      phone: identifier.trim(),
      password,
    });

    if (result?.error) {
      setError("Invalid credentials. Please check your phone/email and password.");
      setLoading(false);
      return;
    }

    // The API route will check the role and redirect appropriately
    window.location.href = "/api/auth/redirect-by-role"; 
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        
        <Link href="/">
          <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 hover:text-teal-700 transition">
            Athi Soko Connect
          </h1>
        </Link>
        <p className="text-center text-slate-500 mb-8 text-sm">Log in to access your dashboard</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number or Email</label>
            <input
              type="text"
              placeholder="e.g., 0712345678"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              // Added text-slate-900 and placeholder:text-slate-400 here
              className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                // Added text-slate-900 and placeholder:text-slate-400 here
                className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none pr-12 transition text-slate-900 placeholder:text-slate-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 flex justify-center items-center gap-2 shadow-md shadow-teal-700/20"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : "Log In"}
          </button>
        </form>

        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Don't have an account?{" "}
            <Link href="/register" className="text-teal-700 font-bold hover:underline">Register here</Link>
          </p>
          <p className="text-sm text-slate-600">
             Want to offer services?{" "}
            <Link href="/register/vendor" className="text-teal-700 font-bold hover:underline">Become a Vendor</Link>
          </p>
        </div>
      </div>
    </main>
  );
}