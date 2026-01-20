import { NextResponse } from "next/server";
import { getUserFromToken } from "./auth";

export function requireBotKey(request) {
  const headerKey =
    request.headers.get("x-bot-api-key") ||
    request.headers.get("x-api-key");

  const API_KEY = process.env.BOT_API_KEY;

  if (!API_KEY) {
    console.warn("[BOT] BOT_API_KEY not set");
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Bot API not configured" },
        { status: 500 }
      ),
    };
  }

  if (!headerKey || headerKey !== API_KEY) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Invalid bot API key" },
        { status: 401 }
      ),
    };
  }

  return { ok: true, error: null };
}

export async function requireBotUser(request) {
  const keyCheck = requireBotKey(request);
  if (!keyCheck.ok) return { user: null, error: keyCheck.error };

  const authHeader = request.headers.get("authorization") || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Missing Authorization token" },
        { status: 401 }
      ),
    };
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      ),
    };
  }

  return { user, error: null, status: 200 };
}
