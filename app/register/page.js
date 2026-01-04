"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Register gagal.");
      }

      router.push("/");
      router.refresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8">
        <div className="mb-6" />

        <div className="grid flex-1 items-center gap-10 md:grid-cols-[minmax(0,1.3fr),minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Buat Akun Penjoki
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Satu akun untuk satu penjoki. Data order akan terpisah per akun.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-slate-700"
                >
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="text-sm font-medium text-slate-700"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  required
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Memproses..." : "Register"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-semibold text-sky-600 hover:underline"
              >
                Login
              </Link>
            </p>
          </div>

          <div className="hidden flex-col gap-4 text-sm text-slate-600 md:flex">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-5">
              <h2 className="text-sm font-semibold text-emerald-800">
                Multi-user siap pakai
              </h2>
              <p className="mt-2 text-xs text-emerald-900/80">
                Setiap akun punya data kategori dan order sendiri, jadi nggak
                ketuker antara penjoki yang satu dengan yang lain.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          © 2026 Jokiwi. All rights reserved.
        </p>
      </div>
    </div>
  );
}
