// components/OrderTable.js

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';

/**
 * OrderTable displays a list of orders with search and filter
 * capabilities. It consumes initial data passed from the server
 * component and interacts with the REST API to fetch updated data
 * when filters change.
 */
export default function OrderTable({ initialOrders, initialStats }) {
  const [orders, setOrders] = useState(initialOrders);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState('');
  const [doneFilter, setDoneFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFilteredOrders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (doneFilter !== 'all') params.append('is_done', doneFilter);
        if (paidFilter !== 'all') params.append('is_paid', paidFilter);
        const response = await fetch(`/api/orders?${params}`);
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders);
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFilteredOrders();
  }, [search, doneFilter, paidFilter]);

  const formatPrice = price => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = date => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDelete = async id => {
    if (confirm('Apakah Anda yakin ingin menghapus order ini?')) {
      try {
        const response = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
        if (response.ok) {
          // Refresh orders after deletion
          const params = new URLSearchParams();
          if (search) params.append('search', search);
          const resp = await fetch(`/api/orders?${params}`);
          const data = await resp.json();
          setOrders(data.orders);
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Error deleting order:', err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Pendapatan</h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(stats.totalIncome)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Sudah Dibayar</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatPrice(stats.totalPaid)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Belum Dibayar</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatPrice(stats.totalUnpaid)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 space-y-4 md:space-y-0 md:flex md:items-end md:justify-between">
          <div className="md:w-1/3">
            <label className="label">Pencarian</label>
            <input
              type="text"
              name="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              placeholder="Cari nama client atau tugas"
            />
          </div>
          <div className="md:w-1/3">
            <label className="label">Filter Selesai</label>
            <select
              name="doneFilter"
              value={doneFilter}
              onChange={e => setDoneFilter(e.target.value)}
              className="input"
            >
              <option value="all">Semua</option>
              <option value="true">Selesai</option>
              <option value="false">Belum</option>
            </select>
          </div>
          <div className="md:w-1/3">
            <label className="label">Filter Pembayaran</label>
            <select
              name="paidFilter"
              value={paidFilter}
              onChange={e => setPaidFilter(e.target.value)}
              className="input"
            >
              <option value="all">Semua</option>
              <option value="true">Lunas</option>
              <option value="false">Belum</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tugas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Harga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catatan
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-center" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-center" colSpan={7}>
                    Tidak ada order yang ditemukan.
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.client_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.task_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.subject_or_category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPrice(order.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                      <StatusBadge type="done" status={Boolean(order.is_done)} />
                      <StatusBadge type="paid" status={Boolean(order.is_paid)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.note || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 space-x-2">
                      <Link
                        href={`/orders/${order.id}`}
                        className="btn btn-secondary text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="btn btn-danger text-xs"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}