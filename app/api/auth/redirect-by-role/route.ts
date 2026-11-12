import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = String((session.user as any).role || "").toUpperCase();

  let redirectPath = "/dashboard"; // Default for residents
  if (role === "ADMIN" || role === "SUPER_ADMIN") redirectPath = "/admin";
  if (role === "SECURITY") redirectPath = "/security-dashboard";
  if (role === "VENDOR") redirectPath = "/provider-dashboard";

  return NextResponse.redirect(new URL(redirectPath, request.url));
}