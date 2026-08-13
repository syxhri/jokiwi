"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function BookPage() {
  const router = useRouter();

  const [jokiList, setJokiList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingJoki, setLoadingJoki] = useState(true);
  const [loadingCat, setLoadingCat] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    joki_user_code: "",
    customer_name: "",
    customer_phone: "",
    task_name: "",
    category_id: "",
    deadline_date: "",
    notes: "",
  });

  // Ambil daftar penjoki
  useEffect(() => {
    fetch("/api/customer/orders")
      .then((r) => r.json())
      .then((d) => setJokiList(d.joki || []))
      .catch(() => setJokiList([]))
      .finally(() => setLoadingJoki(false));
  }, []);

  // Ambil kategori ketika penjoki dipilih
  useEffect(() => {
    if (!form.joki_user_code) {
      setCategories([]);
      return;
    }
    setLoadingCat(true);
    fetch(`/api/customer/orders?joki_user_code=${form.joki_user_code}`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCat(false));
  }, [form.joki_user_code]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          category_id: form.category_id ? Number(form.category_id) : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Gagal membuat pesanan");
        return;
      }

      // Redirect ke halaman tracking
      router.push(`/track/${data.orderCode}`);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedJoki = jokiList.find((j) => j.userCode === form.joki_user_code);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 px-4">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 dark:bg-primary-900/40 px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-300 mb-3">
            🎓 Joki Tugas Terpercaya
          </span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">
            Pesan Joki Sekarang
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Isi form di bawah dan penjoki akan segera menghubungimu.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-100 dark:border-slate-800 p-6 space-y-5"
        >
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Pilih penjoki */}
          <div className="space-y-1">
            <label htmlFor="joki_user_code" className="label">
              Pilih Penjoki <span className="text-red-500">*</span>
            </label>
            {loadingJoki ? (
              <div className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />
            ) : (
              <select
                id="joki_user_code"
                name="joki_user_code"
                value={form.joki_user_code}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">-- Pilih penjoki --</option>
                {jokiList.map((j) => (
                  <option key={j.userCode} value={j.userCode}>
                    {j.name || j.username} (@{j.username})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Nama customer */}
          <div className="space-y-1">
            <label htmlFor="customer_name" className="label">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              id="customer_name"
              type="text"
              name="customer_name"
              value={form.customer_name}
              onChange={handleChange}
              className="input"
              placeholder="Nama kamu"
              required
              minLength={2}
            />
          </div>

          {/* Nomor WA customer */}
          <div className="space-y-1">
            <label htmlFor="customer_phone" className="label">
              Nomor WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              id="customer_phone"
              type="tel"
              name="customer_phone"
              value={form.customer_phone}
              onChange={handleChange}
              className="input"
              placeholder="08xxxxxxxxxx"
              required
            />
            <p className="text-xs text-gray-400">
              Digunakan penjoki untuk menghubungimu jika perlu.
            </p>
          </div>

          {/* Nama tugas */}
          <div className="space-y-1">
            <label htmlFor="task_name" className="label">
              Nama Tugas / Deskripsi Singkat <span className="text-red-500">*</span>
            </label>
            <input
              id="task_name"
              type="text"
              name="task_name"
              value={form.task_name}
              onChange={handleChange}
              className="input"
              placeholder="Contoh: Essay Pancasila 1500 kata"
              required
              minLength={3}
            />
          </div>

          {/* Kategori */}
          <div className="space-y-1">
            <label htmlFor="category_id" className="label">
              Kategori / Mata Kuliah{" "}
              <span className="text-gray-400 text-xs">(opsional)</span>
            </label>
            {loadingCat ? (
              <div className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />
            ) : (
              <select
                id="category_id"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                className="input"
                disabled={!form.joki_user_code || categories.length === 0}
              >
                <option value="">
                  {!form.joki_user_code
                    ? "-- Pilih penjoki dulu --"
                    : categories.length === 0
                    ? "-- Tidak ada kategori --"
                    : "-- Pilih kategori --"}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Deadline */}
          <div className="space-y-1">
            <label htmlFor="deadline_date" className="label">
              Deadline <span className="text-gray-400 text-xs">(opsional)</span>
            </label>
            <input
              id="deadline_date"
              type="date"
              name="deadline_date"
              value={form.deadline_date}
              onChange={handleChange}
              className="input"
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className="label">
              Catatan Tambahan{" "}
              <span className="text-gray-400 text-xs">(opsional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="input min-h-[80px] resize-y"
              placeholder="Detail tambahan, instruksi khusus, format yang diinginkan, dll."
              rows={3}
            />
          </div>

          {/* Info: harga ditentukan penjoki */}
          <div className="rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 p-3 text-xs text-sky-700 dark:text-sky-300">
            💡 <strong>Catatan:</strong> Harga akan ditentukan oleh penjoki setelah pesanan diterima. Kamu akan mendapat notifikasi beserta detail harganya.
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full text-sm"
            disabled={submitting || loadingJoki}
          >
            {submitting ? "Mengirim pesanan…" : "Kirim Pesanan 🚀"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Sudah punya kode order?{" "}
          <a
            href="/track"
            className="text-primary-600 hover:underline"
          >
            Lacak pesanan kamu
          </a>
        </p>
      </div>
    </div>
  );
}
