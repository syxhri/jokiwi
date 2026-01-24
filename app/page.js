import Link from "next/link";
import { requireAuth } from "@/lib/auth.js";

export const metadata = {
  title: "Jokiwi - Joki with Izee",
  description:
    "Catat dan kelola jokian mu dengan mudah di sini.",
};

export default async function HomePage() {
  const user = await requireAuth();

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br from-primary-50/80 via-white to-sky-50 px-6 py-10 shadow-sm sm:px-10 sm:py-14 animate-fade-in-up dark:from-primary-900/40 dark:via-slate-950 dark:to-slate-900 dark:border-slate-800">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-[-3rem] h-52 w-52 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative space-y-6">
          <p className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-primary-700 shadow-sm backdrop-blur dark:bg-slate-900/70">
            Catat jokianmu, hidup jadi lebih <s className="mx-1">malas</s> mudah 🎓
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-50">
            Kelola jokian dengan rapi{" "}
            <span className="text-primary-600 dark:text-primary-400">
              tanpa berantakan.
            </span>
          </h1>

          <p className="max-w-xl text-sm text-gray-600 sm:text-base dark:text-gray-300">
            Jokiwi bantu kamu nyatat client, tugas, harga, status pengerjaan
            & pembayaran, sampai bikin struk otomatis dalam sekali klik.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href={user ? "/order" : "/login"}
              className="btn btn-primary flex items-center gap-2"
            >
              {user ? "Buka dashboard" : "Login"}
              <span className="text-xs">↗</span>
            </Link>
            <Link href={user ? "/category" : "/register"} className="btn btn-secondary">
              {user ? "Lihat per kategori" : "Register"}
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Struk pembayaran otomatis (PNG & PDF)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span>Ringkasan pendapatan & orderan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>QRIS sekali klik untuk tiap order</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold text-primary-600">01</p>
          <h2 className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-50">
            Pantau jokian per kategori
          </h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Lihat berapa banyak orderan dan pendapatan per mata kuliah / kategori
            biar tau mana yang paling cuan 🤑.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold text-primary-600">02</p>
          <h2 className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-50">
            Status jelas, ga ada yang kelewat
          </h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Tandai selesai / belum selesai serta lunas / belum lunas untuk tiap orderan.
            Sekali liat langsung kebaca dengan jelas 🗿.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold text-primary-600">03</p>
          <h2 className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-50">
            Struk profesional
          </h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Kirim bukti pembayaran yang rapi ke client: format struk konsisten,
            ada tanggal, ID order, dan detail tugas.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
          Cara pakainya singkat
        </h2>
        <ol className="mt-3 space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <li>1. Tambah kategori / mata kuliah yang biasa kamu pegang.</li>
          <li>2. Setiap ada client baru, buat orderan dari menu Orderan Baru.</li>
          <li>3. Update status pengerjaan & pembayaran sambil jalan.</li>
          <li>
            4. Kalau client minta bukti, klik <b>Buat Struk</b> dan kirim PNG / PDF
            nya.
          </li>
        </ol>
      </section>
    </div>
  );
}