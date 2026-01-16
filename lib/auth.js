import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserByCode } from "./db.js";

export const AUTH_COOKIE_NAME = "token";

const JWT_SECRET = process.env.JWT_SECRET;

const TOKEN_EXPIRES_IN = "7d";

export function signToken(userCode) {
  return jwt.sign({ userId: userCode }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: TOKEN_EXPIRES_IN,
  });
}

export function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  const userId = Number(payload?.userId);
  if (!Number.isFinite(userId)) {
    throw new Error("Invalid token payload");
  }
  return { userId };
}

export function getUserIdFromCookies() {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { userId } = verifyToken(token);
    return userId;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const userId = getUserIdFromCookies();
  if (!userId) redirect("/login");
  const user = await findUserByCode(userId);
  if (!user) redirect("/login");
  return user;
}

export async function getCurrentUser() {
  const userId = getUserIdFromCookies();
  if (!userId) return null;
  const user = await findUserByCode(userId);
  return user || null;
}
