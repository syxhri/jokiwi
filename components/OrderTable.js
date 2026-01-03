// components/OrderTable.js

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';

/**
 * OrderTable renders a filterable and sortable list of orders. It
 * accepts an optional `categoryId` prop to restrict queries to a
 * specific category. The table displays all fields for each order
 * along with action buttons for editing or deleting a row. Summary
 * statistics are shown above the table and update dynamically as
 * filters change. Only paid orders are counted toward total income.
 *
 * @param {object} props
 * @param {Array} props.initialOrders
 * @param {object} props.initialStats
 * @param {number|undefined} [props.categoryId]
 */
export default function OrderTable({ initialOrders, initialStats, categoryId }) {
  const [orders, setOrders] = useState(initialOrders);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('assigned_date');
  const [sortDir, setSortDir] = useState('desc');

  const hasData = useMemo(() => orders && orders.length > 0, [orders]);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchData() {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      // translate filter status into is_done or is_paid
      if (filterStatus === 'done') {
        params.set('is_done', 'true');
      } else if (filterStatus === 'not_done') {
        params.set('is_done', 'false');
      } else if (filterStatus === 'paid') {
        params.set('is_paid', 'true');
      } else if (filterStatus === 'not_paid') {
        params.set('is_paid', 'false');
      }
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      if (categoryId) {
        params.set('categoryId', String(categoryId));
      }
      try {
        const res = await fetch(`/api/orders?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders);
          setStats(data.stats);
        }
      } catch {
        // ignore abort errors
      }
    }
    fetchData().catch(() => {});
    return () => controller.abort();
  }, [search, filterStatus, sortBy, sortDir, categoryId]);

  async function handleDelete(id) {
    const ok = window.confirm('Yakin ingin menghapus order ini?');
    if (!ok) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menghapus order');
        return;
      }
      // Remove from local state
      setOrders(prev => prev.filter(o => o.id !== id));
      // Stats will update automatically on next filter change
    } catch {
      alert('Gagal menghapus order');
    }
  }

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Pendapatan</h3>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            Rp {stats.totalIncome.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Sudah Dibayar</h3>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            Rp {stats.totalPaid.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Belum Dibayar</h3>
          <p className="mt-2 text-2xl font-bold text-red-600">
            Rp {stats.totalUnpaid.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Filter + Sort panel */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Pencarian</label>
            <input
              type="text"
              placeholder="Cari nama client atau tugas"
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Filter Status</label>
            <select
              className="input"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Semua</option>
              <option value="done">Selesai</option>
              <option value="not_done">Belum Selesai</option>
              <option value="paid">Lunas</option>
              <option value="not_paid">Belum Lunas</option>
            </select>
          </div>
          <div>
            <label className="label">Urut Berdasarkan</label>
            <select
              className="input"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="assigned_date">Tanggal Disuruh</option>
              <option value="deadline_date">Deadline</option>
              <option value="price">Harga</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Arah Sort</label>
            <select
              className="input"
              value={sortDir}
              onChange={e => setSortDir(e.target.value)}
            >
              <option value="desc">Turun (terbaru / terbesar dulu)</option>
              <option value="asc">Naik (terlama / terkecil dulu)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Nama Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Tugas
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Kategori
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                Tgl Disuruh
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                Deadline
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Harga
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Catatan
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {!hasData && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  Belum ada order.
                </td>
              </tr>
            )}
            {orders.map(order => (
              <tr key={order.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {order.client_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {order.task_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {order.category_name || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {formatDate(order.assigned_date)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {formatDate(order.deadline_date)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  Rp {Number(order.price || 0).toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="space-y-1">
                    <StatusBadge type="done" status={order.is_done} />
                    <StatusBadge type="paid" status={order.is_paid} />
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {order.notes || '-'}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex gap-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(order.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}