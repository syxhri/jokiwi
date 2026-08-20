"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    custom_category: "",
    deadline_date: "",
    notes: "",
  });

  const [useCustomCat, setUseCustomCat] = useState(false);

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
    if (name === "category_id") {
      if (value === "CUSTOM") {
        setUseCustomCat(true);
        setForm((prev) => ({ ...prev, category_id: "" }));
      } else {
        setUseCustomCat(false);
        setForm((prev) => ({ ...prev, category_id: value, custom_category: "" }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validasi 628
    const cleanPhone = form.customer_phone.trim().replace(/[^0-9+]/g, "");
    const formattedPhone = cleanPhone.startsWith("08")
      ? "628" + cleanPhone.slice(2)
      : cleanPhone.startsWith("+62")
      ? cleanPhone.slice(1)
      : cleanPhone;

    if (!/^628[0-9]{8,12}$/.test(formattedPhone)) {
      setError("Nomor WhatsApp wajib diawali 628 (contoh: 628123456789)");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customer_phone: formattedPhone,
          category_id: useCustomCat ? null : form.category_id ? Number(form.category_id) : null,
          custom_category: useCustomCat ? form.custom_category : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Gagal membuat pesanan");
        return;
      }

      // Simpan ke localStorage agar customer bisa lacak tanpa hapal kode
      try {
        const saved = JSON.parse(localStorage.getItem("jokiwi_recent_orders") || "[]");
        const existingIdx = saved.findIndex((o) => o.orderCode === data.orderCode);
        const newItem = {
          orderCode: data.orderCode,
          taskName: form.task_name,
          createdAt: new Date().toISOString(),
        };
        if (existingIdx >= 0) saved[existingIdx] = newItem;
        else saved.unshift(newItem);
        localStorage.setItem("jokiwi_recent_orders", JSON.stringify(saved.slice(0, 10)));
      } catch {}

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
              placeholder="628123456789"
              required
            />
            <p className="text-xs text-gray-400">
              Wajib diawali <strong className="text-gray-600 dark:text-gray-300">628</strong> (Contoh: 628123456789).
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
          <div className="space-y-2">
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
                value={useCustomCat ? "CUSTOM" : form.category_id}
                onChange={handleChange}
                className="input"
                disabled={!form.joki_user_code}
              >
                <option value="">
                  {!form.joki_user_code
                    ? "-- Pilih penjoki dulu --"
                    : "-- Pilih kategori --"}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                {form.joki_user_code && (
                  <option value="CUSTOM">✏️ Input Kategori Sendiri...</option>
                )}
              </select>
            )}

            {/* Input custom category */}
            {useCustomCat && (
              <div className="pt-1">
                <input
                  type="text"
                  name="custom_category"
                  value={form.custom_category}
                  onChange={handleChange}
                  className="input text-xs"
                  placeholder="Ketik nama mata kuliah / kategori baru…"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-primary-600 dark:text-primary-400 mt-1">
                  ✨ Kategori baru ini akan tersimpan otomatis untuk penjoki.
                </p>
              </div>
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
            {submitting ? "Mengirim pesanan…" : "Kirim Order 🚀"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Sudah pernah order sebelumnya?</p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/track" className="rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-2 transition-colors">
              Cek Status Order
            </Link>
            <Link href="/my-orders" className="rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-2 transition-colors">
              Riwayat Order Saya
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
