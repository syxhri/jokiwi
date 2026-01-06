// components/Navbar.js

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let ignore = false;

    async function fetchUser() {
      try {
        const res = await fetch('/api/user');
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

    fetchUser();
    return () => {
      ignore = true;
    };
  }, [pathname]);

  async function handleLogout() {
    if (!window.confirm('Yakin mau logout?')) return;

    try {
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
        {/* Brand - selalu "Jokiwi" biar pendek dan nggak bikin navbar turun di HP */}
        <Link href="/" className="text-lg font-bold text-primary-600 whitespace-nowrap">
          Jokiwi
        </Link>

        {/* Main nav links */}
        <nav className="flex items-center gap-4 text-sm font-medium overflow-x-auto">
          <Link href="/orders" className="text-gray-700 hover:text-gray-900 whitespace-nowrap">
            All Orders
          </Link>
          <Link href="/orders/new" className="text-gray-700 hover:text-gray-900 whitespace-nowrap">
            New Order
          </Link>
          {user && (
            <Link href="/profile" className="text-gray-700 hover:text-gray-900 whitespace-nowrap">
              Profile
            </Link>
          )}
        </nav>

        {/* Auth controls */}
        <div className="flex items-center gap-3 text-sm whitespace-nowrap">
          {user ? (
            <>
              {/* dulu hidden di layar kecil, sekarang nggak supaya kelihatan juga di HP */}
              <span className="text-gray-700">
                Hi,&nbsp;{user.name || user.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-gray-900">
                Login
              </Link>
              <Link href="/register" className="text-primary-600 hover:text-primary-800">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}