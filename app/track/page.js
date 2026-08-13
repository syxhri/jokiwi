"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TrackPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [recentOrders, setRecentOrders] = useState([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("jokiwi_recent_orders") || "[]");
      setRecentOrders(saved);
    } catch {}
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed.startsWith("OD") || trimmed.length < 5) {
      setError("Kode order tidak valid. Contoh: OD1A2B3C...");
      return;
    }
    router.push(`/track/${trimmed}`);
  }

  function clearHistory() {
    try {
      localStorage.removeItem("jokiwi_recent_orders");
      setRecentOrders([]);
    } catch {}
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
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

        {/* Riwayat Pesanan Terakhir di Perangkat Ini */}
        {recentOrders.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow border border-gray-100 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                📋 Pesanan Terakhir Kamu
              </h2>
              <button
                type="button"
                onClick={clearHistory}
                className="text-[11px] text-red-500 hover:underline"
              >
                Hapus
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {recentOrders.map((item) => (
                <Link
                  key={item.orderCode}
                  href={`/track/${item.orderCode}`}
                  className="py-2.5 flex items-center justify-between text-xs hover:bg-gray-50 dark:hover:bg-slate-800/50 px-2 rounded-lg transition"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
                      {item.orderCode}
                    </p>
                    <p className="text-gray-500 truncate max-w-[180px]">
                      {item.taskName || "Pesanan Joki"}
                    </p>
                  </div>
                  <span className="text-primary-600 dark:text-primary-400 font-medium">
                    Lihat →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

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
