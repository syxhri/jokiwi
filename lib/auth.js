import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserByCode } from "./db.js";
import { z } from "zod";

export const authSchema = z.object({
  username: z
    .string()
    .trim()
    .min(5, "Username minimal 5 karakter")
    .max(20, "Username maksimal 20 karakter")
    .regex(/^[a-zA-Z0-9._]+$/, "Username hanya boleh huruf, angka, titik, underscore")
    .regex(/[a-zA-Z]/, "Username harus ada 1 huruf")
    .refine((v) => !v.includes(".."), "Username tidak boleh mengandung '..'"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter")
    .regex(/[a-z]/, "Password harus punya huruf kecil")
    .regex(/[A-Z]/, "Password harus punya huruf besar")
    .regex(/[0-9]/, "Password harus punya angka")
    .regex(/[^a-zA-Z0-9]/, "Password harus punya simbol"),
});

export function authValidator({ username, password }) {
  const result = authSchema.safeParse({ username, password });
  if (!result.success) {
    return result.error.flatten().fieldErrors;
  } else {
    return result;
  }
}

export const AUTH_COOKIE_NAME = "token";

const JWT_SECRET = process.env.JWT_SECRET;

const TOKEN_EXPIRES_IN = "7d";

export function signToken(userCode) {
  return jwt.sign({ userId: userCode }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: TOKEN_EXPIRES_IN,
  });
}

export function signTokenUser(user) {
  return jwt.sign({
    id: user.userCode,
    username: user.username,
  },
  JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: TOKEN_EXPIRES_IN,
  });
}

export function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  const userId = String(payload?.userId);
  if (!userId.startsWith("U")) {
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

export async function getUserFromToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    const user = await findUserByCode(payload.id);
    return user || null;
  } catch {
    return null;
  }
}
