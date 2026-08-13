"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function safeNext(next) {
  if (!next) return "/";
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export default function RegisterPage({ next }) {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    whatsapp_phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const authQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.replace(safeNext(next));
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Registrasi gagal");
      }
    } catch (err) {
      setError("Registrasi gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-8">
      <h1 className="text-3xl font-bold mb-1">Register</h1>
      <p className="text-xs text-gray-500 mb-4">Daftar sebagai penjoki</p>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-100 dark:border-slate-800 p-6 space-y-4"
      >
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Username */}
        <div>
          <label className="label">Username</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            className="input"
            autoComplete="username"
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              className="input pr-10"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-5 0-9.27-3.11-11-8 0-1.13.22-2.21.63-3.2" />
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.58A3 3 0 0 0 13.41 13.4" />
                  <path d="M9.88 4.24A9.87 9.87 0 0 1 12 4c5 0 9.27 3.11 11 8a10.89 10.89 0 0 1-1.65 3.35" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Min. 8 karakter, harus ada huruf besar, kecil, angka, dan simbol.
          </p>
        </div>

        {/* Nama */}
        <div>
          <label className="label">Nama</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input"
            placeholder="Opsional"
            autoComplete="name"
          />
        </div>

        {/* WhatsApp — WAJIB */}
        <div>
          <label className="label">
            Nomor WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="whatsapp_phone"
            value={form.whatsapp_phone}
            onChange={handleChange}
            className="input"
            placeholder="08xxxxxxxxxx"
            required
            autoComplete="tel"
          />
          <p className="text-xs text-gray-400 mt-1">
            Digunakan customer untuk mengirim bukti pembayaran ke kamu.
          </p>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Mendaftar…" : "Register"}
          </button>
        </div>
      </form>
      <p className="mt-4 text-sm text-center">
        Sudah punya akun?{" "}
        <Link href={`/login${authQuery}`} className="text-primary-600 hover:text-primary-800">
          Login
        </Link>
      </p>
    </div>
  );
}
