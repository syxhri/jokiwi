"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import ThemeToggle from "./ThemeToggle";
import LogoIcon from "./LogoIcon";

// ─── Notification Bell ─────────────────────────────────────────
function NotificationBell({ userId }) {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unreadCount || 0);
      setNotifications(data.notifications || []);
    } catch {}
    finally { setLoading(false); }
  }, [userId]);

  // Initial load + poll setiap 30 detik
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      await fetchNotifications();
      if (unread > 0) {
        fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
        setUnread(0);
      }
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
    finally { setDeletingId(null); }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications([]);
      setUnread(0);
    } catch {}
    finally { setDeletingAll(false); }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white dark:bg-slate-800 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"
        aria-label="Notifikasi"
        id="notification-bell"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Notifikasi</span>
              {notifications.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="text-[11px] text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingAll ? "Menghapus…" : "Hapus semua"}
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
              {loading ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">Memuat…</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">Belum ada notifikasi</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-3 text-sm flex items-start gap-2 ${n.isRead ? "text-gray-500" : "text-gray-800 dark:text-gray-100 font-medium"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2">{n.message}</p>
                      {n.orderCode && (
                        <Link
                          href={`/order/${n.orderCode}`}
                          className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 px-2 py-0.5 rounded-md transition-colors"
                          onClick={() => setOpen(false)}
                        >
                          Detail Order
                        </Link>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString("id-ID") : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(n.id)}
                      disabled={deletingId === n.id}
                      className="flex-shrink-0 mt-0.5 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors"
                      aria-label="Hapus notifikasi"
                    >
                      {deletingId === n.id ? (
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// ─── Main Navbar ───────────────────────────────────────────────
export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const authQuery = next ? `?next=${encodeURIComponent(next)}` : "";

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

  // Daftarkan service worker + subscribe push untuk penjoki yang login
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    async function registerAndSubscribe() {
      try {
        // 1. Register service worker
        const reg = await navigator.serviceWorker.register("/sw.js");

        // 2. Minta izin notifikasi (hanya jika belum diputuskan)
        let permission = Notification.permission;
        if (permission === "default") {
          // Delay sedikit agar halaman selesai render dulu
          await new Promise((r) => setTimeout(r, 2000));
          permission = await Notification.requestPermission();
        }
        if (permission !== "granted") return;

        // 3. Cek apakah sudah subscribe
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          // Sudah subscribe — kirim ulang ke server supaya DB selalu up-to-date
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: existingSub.toJSON() }),
          }).catch(() => {});
          return;
        }

        // 4. Ambil VAPID public key lalu subscribe
        const vapidRes = await fetch("/api/push/subscribe");
        if (!vapidRes.ok) return;
        const { vapidPublicKey } = await vapidRes.json();
        if (!vapidPublicKey) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });

        // 5. Simpan subscription ke server
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        }).catch(() => {});
      } catch {
        // Gagal silent — tidak perlu crash UI
      }
    }

    // Hanya jalankan jika ada user yang login
    if (user) {
      registerAndSubscribe();
    }
  }, [user]); // re-run ketika user berubah (login/logout)

  const [logoutOpen, setLogoutOpen] = useState(false);

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) return;
      setUser(null);
      setAccountOpen(false);
      setDrawerOpen(false);
      setLogoutOpen(false);
      router.push("/");
      router.refresh?.();
    } catch {}
  }

  const brandLabel =
    !loadingUser && user ? `${user.name || user.username} - Jokiwi` : "Jokiwi";

  const firstLetter = (user?.name || user?.username || "U")
    .charAt(0)
    .toUpperCase();

  const isActive = (href) =>
    pathname === href ? "text-primary-600" : "text-gray-700 dark:text-gray-300";

  const drawerActive = (href) =>
    pathname === href
      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800";

  return (
    <>
      <header className="border-b bg-white dark:bg-slate-900 dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          {/* Kiri: tombol drawer + brand */}
          <div className="flex items-center gap-2">
            {/* Tombol buka drawer (mobile) */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 md:hidden"
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
              href="/"
              className={`${isActive("/")} hover:text-gray-900 dark:hover:text-gray-100 whitespace-nowrap`}
            >
              Home
            </Link>
            {/* Link /book selalu tampil — untuk customer */}
            <Link
              href="/book"
              className={`${isActive("/book")} hover:text-gray-900 dark:hover:text-gray-100 whitespace-nowrap`}
            >
              Order Sekarang
            </Link>
            {user && (
              <>
                <Link
                  href="/categories"
                  className={`${isActive("/categories")} hover:text-gray-900 dark:hover:text-gray-100 whitespace-nowrap`}
                >
                  Kategori
                </Link>
                <Link
                  href="/orders"
                  className={`${isActive("/orders")} hover:text-gray-900 dark:hover:text-gray-100 whitespace-nowrap`}
                >
                  Orderan
                </Link>
              </>
            )}
          </nav>

          {/* Kanan: bell + auth / akun */}
          <div className="relative flex items-center gap-2 text-sm whitespace-nowrap">
            {/* Notification bell — hanya untuk penjoki yang login */}
            {!loadingUser && user && (
              <NotificationBell userId={user.id} />
            )}

            {loadingUser ? (
              <div className="h-8 w-20 rounded-full bg-gray-100 dark:bg-slate-800 animate-pulse" />
            ) : user ? (
              <>
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full bg-transparent px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-slate-800"
                  id="account-menu-button"
                >
                  <span className="hidden sm:inline max-w-[120px] truncate text-xs font-medium text-gray-700 dark:text-gray-300">
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
                    <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-xl">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Akun
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                        onClick={() => setAccountOpen(false)}
                      >
                        Profil
                      </Link>
                      <button
                        type="button"
                        onClick={() => setLogoutOpen(true)}
                        className="flex w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-slate-800"
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
                  href={`/login${authQuery}`}
                  className={`${isActive("/login")} hover:text-gray-900 dark:hover:text-gray-100`}
                >
                  Login
                </Link>
                <Link
                  href={`/register${authQuery}`}
                  className={`${isActive("/register")} hover:text-gray-900 dark:hover:text-gray-100`}
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
          <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 shadow-xl md:hidden">
            <div className="flex items-center border-b dark:border-slate-800 px-4 py-3">
              <LogoIcon className="h-8 w-8 flex-shrink-0" />
              <span className="mt-1 ml-2 truncate text-base font-semibold text-primary-600">
                {brandLabel}
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
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
                href="/"
                className={`rounded-lg px-3 py-2 ${drawerActive("/")}`}
                onClick={() => setDrawerOpen(false)}
              >
                Home
              </Link>

              {/* Order Sekarang — selalu tampil */}
              <Link
                href="/book"
                className={`rounded-lg px-3 py-2 ${drawerActive("/book")}`}
                onClick={() => setDrawerOpen(false)}
              >
                Order Sekarang
              </Link>

              {user && (
                <>
                  <Link
                    href="/categories"
                    className={`rounded-lg px-3 py-2 ${drawerActive("/categories")}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Kategori
                  </Link>
                  <Link
                    href="/orders"
                    className={`rounded-lg px-3 py-2 ${drawerActive("/orders")}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Orderan
                  </Link>
                </>
              )}

              <hr className="my-2 border-gray-200 dark:border-slate-700" />

              {user ? (
                <>
                  <div className="px-3 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Akun
                  </div>
                  <Link
                    href="/profile"
                    className={`rounded-lg px-3 py-2 ${drawerActive("/profile")}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Profil
                  </Link>
                  <button
                    type="button"
                    onClick={() => setLogoutOpen(true)}
                    className="rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/login${authQuery}`}
                    className={`rounded-lg px-3 py-2 ${drawerActive("/login")}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href={`/register${authQuery}`}
                    className={`rounded-lg px-3 py-2 ${drawerActive("/register")}`}
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
      {/* Logout confirm dialog */}
      {logoutOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setLogoutOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <p className="font-semibold text-gray-900 dark:text-gray-50">Yakin mau logout?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleLogout}
                  className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600"
                >
                  Logout
                </button>
                <button
                  onClick={() => setLogoutOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
