// components/CategoryForm.js

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Form for creating or editing a category. Accepts an optional
 * category object; when present the form fields are prefilled and
 * submission will update the existing category. On success the user
 * is redirected back to the categories list. A back button allows
 * the user to navigate away; if unsaved changes exist a
 * confirmation prompt is displayed.
 *
 * @param {object} props
 * @param {object|null} props.category
 */
export default function CategoryForm({ category = null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    notes: category?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Snapshot of initial state to detect unsaved changes
  const initialSnapshot = useMemo(() => JSON.stringify(form), []);
  const isDirty = JSON.stringify(form) !== initialSnapshot;

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = category ? `/api/categories/${category.id}` : '/api/categories';
      const method = category ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Gagal menyimpan kategori');
      }
    } catch {
      setError('Gagal menyimpan kategori');
    } finally {
      setLoading(false);
    }
  };

  function handleBack() {
    if (isDirty) {
      const ok = window.confirm('Perubahan belum disimpan. Yakin ingin kembali?');
      if (!ok) return;
    }
    router.push('/');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="label">Nama Kategori *</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="input"
          required
        />
      </div>
      <div>
        <label className="label">Deskripsi</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          className="input"
          rows={3}
        />
      </div>
      <div>
        <label className="label">Catatan</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          className="input"
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="btn btn-secondary"
        >
          Kembali
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}