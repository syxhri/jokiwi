// components/CategoryForm.js
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CategoryForm({ category = null }) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    notes: category?.notes || '',
  });

  const initialSnapshot = useMemo(
    () => JSON.stringify(formData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const isDirty = JSON.stringify(formData) !== initialSnapshot;

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    const url = category
      ? `/api/categories/${category.id}`
      : '/api/categories';
    const method = category ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      alert('Gagal menyimpan kategori');
      return;
    }

    router.push('/');
  }

  function handleBack() {
    if (isDirty) {
      const ok = window.confirm(
        'Perubahan belum disimpan. Yakin ingin kembali?',
      );
      if (!ok) return;
    }
    // Langsung balik ke halaman kategori
    router.push('/');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nama Kategori *
        </label>
        <input
          type="text"
          required
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          value={formData.name}
          onChange={handleChange('name')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Deskripsi
        </label>
        <textarea
          rows={3}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          value={formData.description}
          onChange={handleChange('description')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Catatan
        </label>
        <textarea
          rows={2}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
          value={formData.notes}
          onChange={handleChange('notes')}
        />
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
