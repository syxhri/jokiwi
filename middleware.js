import { NextResponse } from "next/server";

const AUTH_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
];

function isAuthPath(pathname) {
  return AUTH_PATHS.some(
    (path) => pathname.startsWith(path + "/") || path === pathname
  );
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api") && !isAuthPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;

  if (isAuthPath(pathname) && token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isAuthPath(pathname) && !token) {
    const loginUrl = new URL("/login", req.url);

    loginUrl.searchParams("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
