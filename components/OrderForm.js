"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderForm({ data }) {
  const { order, category } = data;
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    client_name: order?.client_name || "",
    task_name: order?.task_name || "",
    categoryId: order?.categoryId || "",
    categoryCode: order?.categoryCode || "",
    price: order?.price?.toString() || "",
    notes: order?.notes || "",
    is_done: Boolean(order?.is_done) || false,
    is_paid: Boolean(order?.is_paid) || false,
    assigned_date:
      order?.assigned_date || new Date().toISOString().slice(0, 10),
    deadline_date: order?.deadline_date || "",
  });
  
  const initialSnapshot = useMemo(() => JSON.stringify(form), []);
  const isDirty = JSON.stringify(form) !== initialSnapshot;

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/category");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch {}
    }
    fetchCategories().catch(() => {});
    async function fetchCategory() {
      if (!category) return;
      try {
        const res = await fetch(`/api/category/${category}`);
        if (res.ok) {
          const data = await res.json();
          setForm((prev) => ({
            ...prev,
            categoryId: data.id,
            categoryCode: category,
          }));
        }
      } catch {}
    }
    fetchCategory().catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = order ? `/api/order/${order.orderCode}` : "/api/order";
      const method = order ? "PUT" : "POST";
      const payload = {
        ...form,
        price: Number(form.price) || 0,
      };
      if (!payload.categoryId) {
        delete payload.categoryId;
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        payload.categoryCode
          ? router.push(`/category/${payload.categoryCode}`)
          : router.push("/order");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Gagal menyimpan orderan");
      }
    } catch {
      setError("Gagal menyimpan orderan");
    } finally {
      setLoading(false);
    }
  };

  function handleBack() {
    if (isDirty) {
      const ok = window.confirm("Perubahan belum disimpan. Yakin mau kembali?");
      if (!ok) return;
    }
    router.push("/order");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-md p-6 space-y-6"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="label">
            Nama Client <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="client_name"
            value={form.client_name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">
            Nama Tugas <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="task_name"
            value={form.task_name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="label">Kategori / Mata Kuliah</label>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            className="input"
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
          <label className="label">
            Harga (Rp) <span className="text-red-500">*</span>
          </label>
          <input
            type="currency"
            name="price"
            value={form.price}
            onChange={handleChange}
            className="input"
            required
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="label">Tanggal Disuruh</label>
          <input
            type="date"
            name="assigned_date"
            value={form.assigned_date}
            onChange={handleChange}
            className="input"
          />
        </div>
        <div>
          <label className="label">Tanggal Deadline</label>
          <input
            type="date"
            name="deadline_date"
            value={form.deadline_date}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">Catatan</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          className="input"
          rows={3}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_done"
            checked={form.is_done}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span>Selesai</span>
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_paid"
            checked={form.is_paid}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span>Lunas</span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="btn btn-secondary"
        >
          Kembali
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </form>
  );
}
