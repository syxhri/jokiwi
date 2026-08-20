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
      setRecentOrders(Array.isArray(saved) ? saved : []);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            Cek Status Order
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
            <label htmlFor="order-code" className="label">Kode Order</label>
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
            Cek Status
          </button>
        </form>

        {recentOrders.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Riwayat Order
              </span>
              <button onClick={clearHistory} className="text-[11px] text-red-500 hover:text-red-700">
                Hapus
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {[...recentOrders].reverse().map((item) => (
                <div key={item.orderCode} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {item.orderCode}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[180px] mt-0.5">
                      {item.taskName || "Order Joki"}
                    </p>
                  </div>
                  <Link
                    href={`/track/${item.orderCode}`}
                    className="flex-shrink-0 ml-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                  >
                    Cek Status
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-xs text-gray-400">
            Belum pernah order?{" "}
            <Link href="/book" className="text-primary-600 hover:underline font-medium">
              Order sekarang
            </Link>
          </p>
          {recentOrders.length > 0 && (
            <p className="text-xs text-gray-400">
              <Link href="/my-orders" className="text-primary-600 hover:underline font-medium">
                Lihat semua riwayat order
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}