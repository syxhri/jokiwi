import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUser, findUserByCode } from "./db.js";
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

export const whatsappSchema = z
  .string()
  .trim()
  .min(9, "Nomor WhatsApp terlalu pendek")
  .max(16, "Nomor WhatsApp terlalu panjang")
  .regex(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, "Format nomor WhatsApp tidak valid (contoh: 08xxxxxxxxxx)");

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
    userId: user.userCode,
    role: user.role || "joki",
  },
  JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: TOKEN_EXPIRES_IN,
  });
}

export function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  const userId = String(payload?.userId || payload?.id);
  return { userId, role: payload?.role || "joki" };
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

/** Hanya boleh diakses oleh penjoki (role = 'joki') */
export async function requireJoki() {
  const user = await requireAuth();
  if (user.role !== "joki") redirect("/");
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
    const user = await findUser(payload.userId || payload.id);
    return user || null;
  } catch {
    return null;
  }
}

/** Validasi API route — kembalikan user dari cookie atau null */
export async function getApiUser(cookieStore) {
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { userId } = verifyToken(token);
    const user = await findUserByCode(userId);
    return user || null;
  } catch {
    return null;
  }
}
