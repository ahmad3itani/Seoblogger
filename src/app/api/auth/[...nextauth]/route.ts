// Legacy NextAuth route — auth is now handled by Supabase
// This file is kept as a catch-all redirect for any old NextAuth links
import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.redirect(new URL("/auth/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
}

export async function POST() {
    return NextResponse.redirect(new URL("/auth/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
}
