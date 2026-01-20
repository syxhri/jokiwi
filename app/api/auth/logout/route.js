export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth.js";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out" });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
