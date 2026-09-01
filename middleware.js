import { NextResponse } from "next/server";

// Halaman khusus penjoki — butuh login
const AUTH_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
];

// Halaman/route yang boleh diakses siapa saja tanpa login (customer & publik)
const PUBLIC_PATHS = [
  "/",
  "/book",
  "/track",
  "/my-orders",
  "/api/customer",
  "/api/push",
  "/api/cron",
  "/api/bot",
];

function isAuthPath(pathname) {
  return AUTH_PATHS.some(
    (path) => pathname.startsWith(path + "/") || path === pathname
  );
}

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // Aset statis & internal Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/robots.txt")
  ) {
    return NextResponse.next();
  }

  // API routes non-auth boleh langsung lanjut (auth dicek di handler masing-masing)
  if (pathname.startsWith("/api") && !isAuthPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;

  // Kalau sudah login & coba buka /login atau /register → redirect ke home
  if (isAuthPath(pathname) && token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Halaman publik boleh diakses tanpa login
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Semua halaman penjoki lainnya butuh token
  if (!isAuthPath(pathname) && !token) {
    const loginUrl = new URL("/login", req.url);
    const nextPath = pathname + search;
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
