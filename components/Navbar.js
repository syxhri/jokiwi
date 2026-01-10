// "use client";

// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { useRouter, usePathname } from "next/navigation";

// export default function Navbar() {
//   const [user, setUser] = useState(null);
//   const [loadingUser, setLoadingUser] = useState(true);
//   const router = useRouter();
//   const pathname = usePathname();

//   useEffect(() => {
//     let ignore = false;

//     async function fetchUser() {
//       try {
//         const res = await fetch("/api/user");
//         if (!res.ok) {
//           if (!ignore) setUser(null);
//           return;
//         }
//         const data = await res.json();
//         if (!ignore) setUser(data.user ?? null);
//       } catch {
//         if (!ignore) setUser(null);
//       } finally {
//         if (!ignore) setLoadingUser(false);
//       }
//     }

//     fetchUser();
//     return () => {
//       ignore = true;
//     };
//   }, [pathname]);

//   async function handleLogout() {
//     if (!window.confirm("Yakin mau logout?")) return;

//     try {
//       const res = await fetch("/api/auth/logout", { method: "POST" });
//       if (res.ok) {
//         setUser(null);
//         router.push("/login");
//         router.refresh?.();
//       }
//     } catch {}
//   }

//   return (
//     <header className="border-b bg-white">
//       <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
//         {/* Brand */}
//         <Link
//           href="/"
//           className="text-lg font-bold text-primary-600 whitespace-nowrap"
//         >
//           Jokiwi
//         </Link>

//         {/* Main nav links */}
//         <nav className="flex items-center gap-4 text-sm font-medium overflow-x-auto">
//           <Link
//             href="/orders"
//             className="text-gray-700 hover:text-gray-900 whitespace-nowrap"
//           >
//             Semua Orderan
//           </Link>
//           {/*<Link
//             href="/orders/new"
//             className="text-gray-700 hover:text-gray-900 whitespace-nowrap"
//           >
//             Tambah Orderan
//           </Link>*/}
//           {user && (
//             <Link
//               href="/profile"
//               className="text-gray-700 hover:text-gray-900 whitespace-nowrap"
//             >
//               Profil
//             </Link>
//           )}
//         </nav>

//         {/* Auth controls */}
//         <div className="flex items-center gap-3 text-sm whitespace-nowrap">
//           {user ? (
//             <>
//               {/*<span className="text-gray-700">
//                 Hai,&nbsp;{user.name || user.username}
//               </span>*/}
//               <button
//                 onClick={handleLogout}
//                 className="text-red-600 hover:text-red-800"
//               >
//                 Logout
//               </button>
//             </>
//           ) : (
//             <>
//               <Link href="/login" className="text-gray-700 hover:text-gray-900">
//                 Login
//               </Link>
//               <Link
//                 href="/register"
//                 className="text-primary-600 hover:text-primary-800"
//               >
//                 Register
//               </Link>
//             </>
//           )}
//         </div>
//       </div>
//     </header>
//   );
// }

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user");
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }

    fetchUser().catch(() => {});
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

  const brandLabel = user ? `${user.name || user.username} - Jokiwi` : "Jokiwi";

  const firstLetter = (user?.name || user?.username || "U")
    .charAt(0)
    .toUpperCase();

  const isActive = (href) =>
    pathname === href ? "text-primary-600" : "text-gray-700";

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
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

            <Link
              href="/"
              className="flex max-w-[55vw] items-center gap-2 truncate"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white">
                J
              </span>
              <span className="truncate text-lg font-bold text-primary-600">
                {brandLabel}
              </span>
            </Link>
          </div>

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
            <Link
              href="/profile"
              className={`${isActive(
                "/profile"
              )} hover:text-gray-900 whitespace-nowrap`}
            >
              Profil
            </Link>
          </nav>

          <div className="relative flex items-center gap-3 text-sm whitespace-nowrap">
            {user ? (
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
                  <div className="absolute right-0 top-11 z-30 w-40 rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
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

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl md:hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="max-w-[70%] truncate text-sm font-semibold text-primary-600">
                {brandLabel}
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
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
