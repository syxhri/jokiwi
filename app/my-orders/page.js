"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("jokiwi_recent_orders") || "[]");
      setOrders(Array.isArray(saved) ? saved : []);
    } catch { setOrders([]); }
  }, []);

  function clearAll() {
    localStorage.removeItem("jokiwi_recent_orders");
    setOrders([]);
  }

  const filtered = useMemo(() => {
    let list = [...orders];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o => o.orderCode?.toLowerCase().includes(q) || o.taskName?.toLowerCase().includes(q));
    }
    return sort === "oldest" ? list.reverse() : list;
  }, [orders, search, sort]);

  return (
    <div className="min-h-[70vh] px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Riwayat Orderan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Daftar orderan yang pernah kamu buat di perangkat ini.</p>
        </div>
        <div className="flex gap-2">
          <input type="search" placeholder="Cari kode atau nama tugas..." value={search} onChange={(e) => setSearch(e.target.value)} className="input flex-1 text-sm" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto text-sm pr-7">
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-8 text-center shadow-sm">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-3 text-sm text-gray-500">Belum ada riwayat order di perangkat ini.</p>
            <Link href="/book" className="mt-4 btn btn-primary text-sm inline-block">Buat Order Sekarang</Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{filtered.length} orderan</span>
              <button onClick={clearAll} className="text-[11px] text-red-500 hover:text-red-700">Hapus semua</button>
            </div>
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Tidak ada hasil untuk pencarian tersebut.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {filtered.map((item) => (
                  <div key={item.orderCode} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{item.orderCode}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[220px] mt-0.5">{item.taskName || "Orderan Joki"}</p>
                    </div>
                    <Link href={`/track/${item.orderCode}`} className="flex-shrink-0 ml-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors">
                      Cek Status
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          <Link href="/book" className="btn btn-primary text-xs">Buat Order Baru</Link>
          <Link href="/track" className="btn btn-secondary text-xs">Cek Status via Kode</Link>
        </div>
      </div>
    </div>
  );
}
