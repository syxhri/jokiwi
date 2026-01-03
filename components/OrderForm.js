// components/OrderForm.js

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderForm({ order = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    client_name: order?.client_name || '',
    task_name: order?.task_name || '',
    subject_or_category: order?.subject_or_category || '',
    price: order?.price || '',
    note: order?.note || '',
    is_done: order?.is_done || false,
    is_paid: order?.is_paid || false,
  });

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = order ? `/api/orders/${order.id}` : '/api/orders';
      const method = order ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price, 10),
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save order');
      }
      router.push('/orders');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">Nama Client *</label>
          <input
            type="text"
            name="client_name"
            value={formData.client_name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Nama Tugas *</label>
          <input
            type="text"
            name="task_name"
            value={formData.task_name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Mata Kuliah / Kategori</label>
          <input
            type="text"
            name="subject_or_category"
            value={formData.subject_or_category}
            onChange={handleChange}
            className="input"
          />
        </div>
        <div>
          <label className="label">Harga (Rp) *</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="input"
            required
            min="0"
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Catatan</label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            className="input"
            rows={3}
          />
        </div>
        <div className="flex items-center space-x-4 md:col-span-2">
          <div className="flex items-center">
            <input
              id="is_done"
              type="checkbox"
              name="is_done"
              checked={formData.is_done}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="is_done" className="text-sm text-gray-700">
              Selesai
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="is_paid"
              type="checkbox"
              name="is_paid"
              checked={formData.is_paid}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="is_paid" className="text-sm text-gray-700">
              Lunas
            </label>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
      </div>
    </form>
  );
}