"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import LogoIcon from "./LogoIcon";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let ignore = false;

    async function fetchUser() {
      setLoadingUser(true);
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        if (!res.ok) {
          if (!ignore) setUser(null);
          return;
        }
        const data = await res.json();
        if (!ignore) setUser(data.user ?? null);
      } catch {
        if (!ignore) setUser(null);
      } finally {
        if (!ignore) setLoadingUser(false);
      }
    }

    fetchUser().catch(() => {});
    return () => {
      ignore = true;
    };
  }, [pathname]);

  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const ok = window.confirm("Yakin mau logout?");
    if (!ok) return;

    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) return;
      setUser(null);
      setAccountOpen(false);
      setDrawerOpen(false);
      router.push("/login");
      router.refresh?.();
    } catch {}
  }

  const brandLabel =
    !loadingUser && user ? `${user.name || user.username} - Jokiwi` : "Jokiwi";

  const firstLetter = (user?.name || user?.username || "U")
    .charAt(0)
    .toUpperCase();

  const isActive = (href) =>
    pathname === href ? "text-primary-600" : "text-gray-700";

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          {/* Kiri: tombol drawer + brand */}
          <div className="flex items-center gap-2">
            {/* Tombol buka drawer (mobile) */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 md:hidden"
              aria-label="Buka menu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Brand */}
            <Link
              href="/"
              className="flex max-w-[55vw] items-center gap-2 truncate"
            >
              <span className="hidden sm:inline-flex">
                <LogoIcon className="h-8 w-8" />
              </span>
              <span className="truncate text-lg font-bold text-primary-600">
                {brandLabel}
              </span>
            </Link>
          </div>

          {/* Nav utama (desktop) */}
          <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
            <Link
              href="/orders"
              className={`${isActive(
                "/orders"
              )} hover:text-gray-900 whitespace-nowrap`}
            >
              Semua Orderan
            </Link>
            <Link
              href="/orders/new"
              className={`${isActive(
                "/orders/new"
              )} hover:text-gray-900 whitespace-nowrap`}
            >
              Orderan Baru
            </Link>
            {!loadingUser && user && (
              <Link
                href="/profile"
                className={`${isActive(
                  "/profile"
                )} hover:text-gray-900 whitespace-nowrap`}
              >
                Profil
              </Link>
            )}
          </nav>

          {/* Kanan: auth / akun */}
          <div className="relative flex items-center gap-3 text-sm whitespace-nowrap">
            {loadingUser ? (
              <div className="h-8 w-20 rounded-full bg-gray-100" />
            ) : user ? (
              <>
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full bg-transparent px-1.5 py-0.5 hover:bg-gray-100"
                >
                  <span className="hidden sm:inline max-w-[120px] truncate text-xs font-medium text-gray-700">
                    {user.name || user.username}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                    {firstLetter}
                  </span>
                </button>

                {accountOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setAccountOpen(false)}
                    />
                    <div className="absolute right-0 top-11 z-50 w-40 rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                        Akun
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setAccountOpen(false)}
                      >
                        Profil
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`${isActive("/login")} hover:text-gray-900`}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-primary-600 hover:text-primary-800"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Drawer (mobile) */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl md:hidden">
            <div className="flex items-center border-b px-4 py-3">
              <LogoIcon className="h-8 w-8 flex-shrink-0" />
              <span className="mt-2 ml-2 truncate text-base font-semibold text-primary-600">
                {brandLabel}
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"
                aria-label="Tutup menu"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1 px-4 py-3 text-sm font-medium">
              <Link
                href="/orders"
                className={`rounded-lg px-3 py-2 ${
                  isActive("/orders") === "text-primary-600"
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setDrawerOpen(false)}
              >
                Semua Orderan
              </Link>
              <Link
                href="/orders/new"
                className={`rounded-lg px-3 py-2 ${
                  isActive("/orders/new") === "text-primary-600"
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setDrawerOpen(false)}
              >
                Orderan Baru
              </Link>
              {user && (
                <Link
                  href="/profile"
                  className={`rounded-lg px-3 py-2 ${
                    isActive("/profile") === "text-primary-600"
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setDrawerOpen(false)}
                >
                  Profil
                </Link>
              )}

              <hr className="my-2 border-gray-200" />

              {user ? (
                <>
                  <div className="px-3 pb-1 text-xs font-semibold text-gray-500">
                    Akun
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`rounded-lg px-3 py-2 ${
                      isActive("/login") === "text-primary-600"
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg px-3 py-2 text-primary-600 hover:bg-primary-50"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
