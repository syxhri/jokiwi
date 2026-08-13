"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed.startsWith("OD") || trimmed.length < 5) {
      setError("Kode order tidak valid. Contoh: OD1A2B3C...");
      return;
    }
    router.push(`/track/${trimmed}`);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            Lacak Pesanan
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Masukkan kode order yang kamu dapat setelah memesan.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white dark:bg-slate-900 shadow-lg border border-gray-100 dark:border-slate-800 p-6 space-y-4"
        >
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div>
            <label htmlFor="order-code" className="label">
              Kode Order
            </label>
            <input
              id="order-code"
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              className="input font-mono uppercase"
              placeholder="OD1A2B3C..."
              required
              autoComplete="off"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Lacak Sekarang →
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Belum pesan?{" "}
          <a href="/book" className="text-primary-600 hover:underline">
            Pesan joki sekarang
          </a>
        </p>
      </div>
    </div>
  );
}
