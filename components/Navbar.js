"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        if (!res.ok) {
          setUser(null);
        } else {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/login");
      router.refresh?.();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-xl bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
              Jokiwi
            </span>
            <span className="text-sm font-semibold text-slate-800 md:text-base">
              Joki Tugas App
            </span>
          </Link>
        </div>

        {/* Links */}
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="hidden text-slate-600 hover:text-sky-600 sm:inline-block"
          >
            Kategori
          </Link>
          <Link
            href="/orders"
            className="text-slate-600 hover:text-sky-600"
          >
            All Orders
          </Link>
          <Link
            href="/orders/new"
            className="hidden text-slate-600 hover:text-sky-600 sm:inline-block"
          >
            New Order
          </Link>

          {/* Auth section */}
          {loadingUser ? null : user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-500 sm:inline-block">
                Login sebagai{" "}
                <span className="font-semibold text-slate-700">
                  {user.name || user.username}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-sky-300 hover:text-sky-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Link
                href="/login"
                className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 hover:border-sky-300 hover:text-sky-700"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-sky-600 px-3 py-1 font-medium text-white hover:bg-sky-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
