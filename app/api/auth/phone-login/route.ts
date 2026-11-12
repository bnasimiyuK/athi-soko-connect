import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone required" }, { status: 400 });
    }

    // Normalize to 254XXXXXXXXX (no plus, no leading zero)
    let clean = String(phone).replace(/\D/g, "");
    if (clean.startsWith("0")) clean = `254${clean.slice(1)}`;
    if (clean.length === 9) clean = `254${clean}`;

    const supabase = adminSupabase();

    // Fetch candidates from Residents and Providers
    const { data: residents } = await supabase
      .from("Residents")
      .select("email, phone")
      .not("email", "is", null);

    const { data: providers } = await supabase
      .from("Providers")
      .select("phone")
      .not("phone", "is", null);

    const normalize = (p: string | null) => {
      if (!p) return "";
      let c = String(p).replace(/\D/g, "");
      if (c.startsWith("0")) c = `254${c.slice(1)}`;
      if (c.length === 9) c = `254${c}`;
      return c;
    };

    // Match resident first
    const resident = (residents || []).find(
      (r: any) => normalize(r.phone) === clean
    );

    if (resident?.email) {
      return NextResponse.json({ email: resident.email });
    }

    // Match provider -> derive pseudo-email
    const provider = (providers || []).find(
      (p: any) => normalize(p.phone) === clean
    );

    if (provider) {
      return NextResponse.json({ email: `${clean}@athi-soko.com` });
    }

    return NextResponse.json({ error: "No account found for that phone number" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}