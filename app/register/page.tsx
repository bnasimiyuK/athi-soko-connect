"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Phone, Lock, Eye, EyeOff, Home, MapPin, CheckCircle2, CreditCard, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { getCourtsByPhase } from "./actions";
import { initiateMpesaPayment } from "./mpesa-actions";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [selectedPhase, setSelectedPhase] = useState(""); 
  const [availableCourts, setAvailableCourts] = useState<string[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [availableHouses, setAvailableHouses] = useState<string[]>([]);
  
  // Validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const router = useRouter();

  const handlePhaseChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const phase = e.target.value;
    setSelectedPhase(phase);
    setAvailableCourts([]); 
    setAvailableHouses([]); 
    
    if (phase) {
      setLoadingCourts(true);
      const result = await getCourtsByPhase(phase);
      if (result.data) setAvailableCourts(result.data);
      setLoadingCourts(false);
    }
  };

  const handleCourtChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const court = e.target.value;
    if (!court) return setAvailableHouses([]);

    const blocks = ["A", "B"];
    const numbers = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, "0"));
    const houses: string[] = [];
    blocks.forEach(block => numbers.forEach(num => houses.push(`${court}-${block}${num}`)));
    setAvailableHouses(houses);
  };

  const validateForm = (data: FormData) => {
    const errors: Record<string, string> = {};
    const name = data.get("name")?.toString().trim() || "";
    const phone = data.get("phone")?.toString().trim() || "";
    const password = data.get("password")?.toString() || "";
    const phase = data.get("phase")?.toString() || "";
    const courtName = data.get("courtName")?.toString() || "";
    const houseNumber = data.get("houseNumber")?.toString() || "";

    // Name validation (no numbers, min 3 chars)
    if (name.length < 3) errors.name = "Name must be at least 3 characters.";
    if (/\d/.test(name)) errors.name = "Name cannot contain numbers.";

    // Phone validation (Kenyan format: 07... or 01...)
    const phoneRegex = /^(?:254|\+254|0)?(7|1)\d{8}$/;
    if (!phoneRegex.test(phone)) {
      errors.phone = "Enter a valid Kenyan phone number (e.g., 0712345678).";
    }

    // Password validation
    if (password.length < 6) errors.password = "Password must be at least 6 characters.";

    // Dropdown validation
    if (!phase) errors.phase = "Please select a phase.";
    if (!courtName) errors.courtName = "Please select a court.";
    if (!houseNumber) errors.houseNumber = "Please select a house.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    const formData = new FormData(e.currentTarget);
    
    // 1. Run Validation
    if (!validateForm(formData)) return;

    setLoading(true);

    const name = formData.get("name")?.toString() || "";
    const phone = formData.get("phone")?.toString() || "";
    const password = formData.get("password")?.toString() || "";
    const phase = formData.get("phase")?.toString() || "";
    const courtName = formData.get("courtName")?.toString() || "";
    const houseNumber = formData.get("houseNumber")?.toString() || "";
    const ahewaOptIn = formData.get("ahewaOptIn") === "on";

    // 2. Call the M-Pesa Flow
    const result = await initiateMpesaPayment({
      name, phone, password, phase, courtName, houseNumber, ahewaOptIn
    }, 1.00);

    if (result.success) {
      alert("Please check your phone and enter your M-Pesa PIN to complete registration.");
      router.push("/login");
    } else {
      setError(result.error || "Payment failed.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4 py-12">
      <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-md">
        
        {/* BACK TO HOME LINK */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition mb-6">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">Create a Resident Account</h1>
          <p className="text-gray-500 text-sm">Join Athi Soko Connect to access estate services.</p>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-6 text-sm text-center font-medium flex items-center justify-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            
            {/* LEFT COLUMN */}
            <div className="space-y-5">
              <h3 className="font-bold text-gray-800 text-lg border-b pb-2">Personal Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className={`absolute left-3 top-3 ${formErrors.name ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="John Doe" 
                    className={`w-full border pl-10 p-3 rounded-lg focus:ring-2 outline-none transition ${
                      formErrors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                    }`} 
                  />
                </div>
                {formErrors.name && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (For Login & M-Pesa)</label>
                <div className="relative">
                  <Phone className={`absolute left-3 top-3 ${formErrors.phone ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                  <input 
                    type="tel" 
                    name="phone" 
                    placeholder="e.g., 0712345678" 
                    className={`w-full border pl-10 p-3 rounded-lg focus:ring-2 outline-none transition ${
                      formErrors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                    }`} 
                  />
                </div>
                {formErrors.phone && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-3 ${formErrors.password ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    placeholder="••••••••" 
                    className={`w-full border pl-10 pr-10 p-3 rounded-lg focus:ring-2 outline-none transition ${
                      formErrors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                    }`} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.password}</p>}
              </div>

              <h3 className="font-bold text-gray-800 text-lg border-b pb-2 pt-4">Property Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 top-3 z-10 ${formErrors.phase ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                    <select 
                      name="phase" 
                      value={selectedPhase} 
                      onChange={handlePhaseChange} 
                      className={`w-full border pl-10 p-3 rounded-lg focus:ring-2 outline-none appearance-none bg-white cursor-pointer transition ${
                        formErrors.phase ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Select Phase</option>
                      <option value="1">Phase 1</option>
                      <option value="2">Phase 2</option>
                    </select>
                  </div>
                  {formErrors.phase && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.phase}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Court Name</label>
                  <div className="relative">
                    <Home className={`absolute left-3 top-3 z-10 ${formErrors.courtName ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                    <select 
                      name="courtName" 
                      onChange={handleCourtChange} 
                      disabled={!selectedPhase || loadingCourts} 
                      className={`w-full border pl-10 p-3 rounded-lg focus:ring-2 outline-none appearance-none bg-white cursor-pointer disabled:bg-gray-100 transition ${
                        formErrors.courtName ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">{loadingCourts ? "Loading..." : "Select Court"}</option>
                      {availableCourts.map((court) => <option key={court} value={court}>{court}</option>)}
                    </select>
                  </div>
                  {formErrors.courtName && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.courtName}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                <select 
                  name="houseNumber" 
                  disabled={availableHouses.length === 0} 
                  className={`w-full border p-3 rounded-lg focus:ring-2 outline-none bg-white cursor-pointer disabled:bg-gray-100 transition ${
                    formErrors.houseNumber ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Select House</option>
                  {availableHouses.map((house) => <option key={house} value={house}>{house}</option>)}
                </select>
                {formErrors.houseNumber && <p className="text-red-500 text-xs mt-1 font-medium">{formErrors.houseNumber}</p>}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-5 flex flex-col">
              <h3 className="font-bold text-gray-800 text-lg border-b pb-2">Estate Fees</h3>
              
              <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl flex-1 flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 className="text-blue-600 mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="font-bold text-blue-900">AHE Payment (Mandatory)</p>
                    <p className="text-xs text-blue-700 mt-1">Required to access estate services. Your account will be created once payment is verified.</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm space-y-3 mt-auto mb-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium text-gray-500">Payment Method</span>
                    <span className="font-bold text-sm text-green-600 bg-green-50 px-2 py-1 rounded">M-Pesa STK Push</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <CreditCard size={16} className="text-blue-500" /> Registration Fee
                    </span>
                    <span className="font-bold text-xl text-blue-700">KES 1.00</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="ahewaOptIn" className="w-5 h-5 mt-0.5 text-blue-600 rounded cursor-pointer shrink-0" />
                  <div>
                    <p className="font-bold text-gray-800">AHEWA Contributions (Optional)</p>
                    <p className="text-xs text-gray-500 mt-1">Opt-in to the community welfare fund.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-lg shadow-md flex justify-center items-center gap-2">
            {loading ? <><Loader2 size={20} className="animate-spin" /> Processing Payment...</> : "Register & Pay KES 1.00"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account? <Link href="/login" className="text-blue-600 font-medium hover:underline">Login here</Link>
        </p>
      </div>
    </main>
  );
}