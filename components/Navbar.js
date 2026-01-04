// components/Navbar.js

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from "next/navigation";

/**
 * A responsive navigation bar that adapts based on authentication state.
 * When a user is logged in it shows a logout button; otherwise it offers
 * links to the login and register pages. The bar is horizontally
 * scrollable on narrow screens to ensure all links remain accessible.
 */
export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/user');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    fetchUser().catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    try {
      const ok = window.confirm('Yakin mau logout?');
      if (!ok) return;
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        router.push('/login');
        router.refresh?.();
      }
    } catch {
      // ignore
    }
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="text-lg font-bold text-primary-600 whitespace-nowrap">
          {user ? user.username : "Jokiwi"}
        </Link>

        {/* Links */}
        <nav className="flex items-center gap-4 text-sm font-medium overflow-x-auto">
          {/*<Link href="/" className="text-gray-700 hover:text-gray-900 whitespace-nowrap">
            Kategori
          </Link>*/}
          <Link href="/orders" className="text-gray-700 hover:text-gray-900 whitespace-nowrap">
            All Orders
          </Link>
          <Link href="/orders/new" className="text-gray-700 hover:text-gray-900 whitespace-nowrap">
            New Order
          </Link>
        </nav>

        {/* Auth Controls */}
        <div className="flex items-center gap-3 text-sm whitespace-nowrap">
          {user ? (
            <>
              <span className="hidden sm:inline text-gray-700">Hi, {user.name || user.username}</span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-700 hover:text-gray-900"
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
  );
}
