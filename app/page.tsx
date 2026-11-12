import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Store, Users, Star } from "lucide-react";

async function FeaturedProviders() {
  const supabase = await createClient();

  const { data: providers, error } = await supabase
    .from("Providers")
    .select(`
      id, 
      name, 
      rating, 
      Categories (label)
    `)
    .eq("verified", true)
    .limit(3);

  if (error) {
    return <div className="text-red-400 text-center py-4">Error loading providers.</div>;
  }

  if (!providers?.length) {
    return <div className="text-gray-400 text-center py-4">No providers found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {providers?.map((provider) => {
        const categoryLabel = Array.isArray(provider.Categories) 
          ? provider.Categories[0]?.label 
          : (provider.Categories as { label: string } | null)?.label;

        return (
          <Link 
            href="/login" 
            key={provider.id} 
            className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex flex-col justify-between hover:bg-white/20 transition-all duration-300 group"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{provider.name}</h3>
                <p className="text-sm font-bold text-blue-300 mt-1">
                  {categoryLabel || "General Service"}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs font-bold">
                <Star size={12} fill="currentColor" /> {provider.rating || "New"}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm border-t border-white/10 pt-3 mt-2 text-gray-300">
              <span className="text-xs text-gray-400">Verified Provider</span>
              <span className="text-blue-400 font-bold flex items-center gap-1">Book &rarr;</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="h-[100dvh] w-full overflow-hidden relative bg-gray-900 font-sans flex flex-col">
      
      {/* BACKGROUND VIDEO - UPDATED TO YOUR CUSTOM WEBM */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        poster="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80" 
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="/Hero.webm" type="video/webm" />
      </video>
      
      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/75 z-10"></div>

      {/* MAIN CONTENT */}
      <div className="relative z-20 flex flex-col h-full w-full max-w-7xl mx-auto px-6 py-4">
        
        {/* 1. NAVBAR */}
        <nav className="flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center p-1 shadow-lg border border-white/20">
              <Image 
                src="/logo.png" 
                alt="Athi Soko Connect Logo" 
                width={40} 
                height={40} 
                className="object-contain"
                priority
              />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Athi Soko Connect</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="px-5 py-2.5 rounded-lg font-medium text-white hover:bg-white/10 transition">Log In</Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-lg shadow-blue-600/30">Sign Up</Link>
          </div>
        </nav>

        {/* 2. HERO SECTION */}
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-white mb-4">
            Your Estate. <br /><span className="text-blue-500">Connected.</span>
          </h1>
          <p className="text-base md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            The all-in-one platform for residents, vendors, and security. Book services, manage visitors, and pay bills seamlessly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
              Create Resident Account <ArrowRight size={20} />
            </Link>
            <Link href="/register/vendor" className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-3.5 rounded-xl font-bold text-lg transition">
              Become a Vendor
            </Link>
          </div>
        </div>

        {/* 3. PROVIDERS SECTION */}
        <div className="shrink-0 mt-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Meet Your Local Providers</h2>
              <p className="text-sm text-gray-400 mt-1">
                Phone numbers and contact details are visible only to logged-in estate members.
              </p>
            </div>
            <Link href="/login" className="text-blue-400 text-sm font-medium hover:underline pb-1">View all &rarr;</Link>
          </div>
          <Suspense fallback={
            <div className="h-[160px] flex items-center justify-center text-gray-400">
              Loading providers...
            </div>
          }>
            <FeaturedProviders />
          </Suspense>
        </div>

        {/* 4. MINI FOOTER */}
        <div className="shrink-0 h-12 mt-4 flex justify-between items-center text-sm text-gray-400 border-t border-gray-800 pt-4">
          <p>© 2026 Athi Soko Connect</p>
          <div className="flex gap-6">
            <Link href="/login" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
              <Users size={16}/> Residents
            </Link>
            <Link href="/register/vendor" className="flex items-center gap-2 hover:text-green-400 transition-colors">
              <Store size={16}/> Vendors
            </Link>
            <Link href="/login" className="flex items-center gap-2 hover:text-orange-400 transition-colors">
              <ShieldCheck size={16}/> Security
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}