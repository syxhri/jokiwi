// components/OrderForm.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderForm({ order = null }) {
  const router = useRouter();

  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    client_name: order?.client_name || '',
    task_name: order?.task_name || '',
    categoryId: order?.categoryId || '',
    price: order?.price?.toString() || '',
    notes: order?.notes || '',
    is_done: Boolean(order?.is_done) || false,
    is_paid: Boolean(order?.is_paid) || false,
    assigned_date:
      order?.assigned_date || new Date().toISOString().slice(0, 10),
    deadline_date: order?.deadline_date || '',
  });

  const initialSnapshot = useMemo(
    () => JSON.stringify(formData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const isDirty = JSON.stringify(formData) !== initialSnapshot;

  useEffect(() => {
    async function loadCategories() {
      const res = await fetch('/api/categories');
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data);
    }
    loadCategories().catch(console.error);
  }, []);

  const handleChange = (field) => (e) => {
    const value =
      e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      ...formData,
      price: Number(formData.price || 0),
    };

    const url = order ? `/api/orders/${order.id}` : '/api/orders';
    const method = order ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // TODO: tampilkan error lebih proper
      alert('Gagal menyimpan order');
      return;
    }

    router.push('/orders');
  }

  function handleBack() {
    if (isDirty) {
      const ok = window.confirm(
        'Perubahan belum disimpan. Yakin ingin kembali?',
      );
      if (!ok) return;
    }
    router.back();
    // router.push('/orders');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nama Client *
          </label>
          <input
            type="text"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            value={formData.client_name}
            onChange={handleChange('client_name')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nama Tugas *
          </label>
          <input
            type="text"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            value={formData.task_name}
            onChange={handleChange('task_name')}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Kategori / Mata Kuliah
          </label>
          <select
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            value={formData.categoryId}
            onChange={handleChange('categoryId')}
          >
            <option value="">Tanpa kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Harga (Rp) *
          </label>
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            value={formData.price}
            onChange={handleChange('price')}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tanggal Disuruh
          </label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            value={formData.assigned_date}
            onChange={handleChange('assigned_date')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tanggal Deadline
          </label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            value={formData.deadline_date}
            onChange={handleChange('deadline_date')}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Catatan
        </label>
        <textarea
          rows={3}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          value={formData.notes}
          onChange={handleChange('notes')}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={formData.is_done}
            onChange={handleChange('is_done')}
          />
          <span>Selesai</span>
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={formData.is_paid}
            onChange={handleChange('is_paid')}
          />
          <span>Lunas</span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Kembali
        </button>
        <button
          type="submit"
          className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Simpan
        </button>
      </div>
    </form>
  );
}
