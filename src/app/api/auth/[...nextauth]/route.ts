// Legacy NextAuth route — auth is now handled by Supabase
// This file is kept as a catch-all redirect for any old NextAuth links
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const origin = new URL(req.url).origin;
    return NextResponse.redirect(new URL("/auth/login", origin));
}

export async function POST(req: Request) {
    const origin = new URL(req.url).origin;
    return NextResponse.redirect(new URL("/auth/login", origin));
}
