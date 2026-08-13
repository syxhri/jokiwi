/**
 * components/MissingWhatsappDialog.js
 * Dialog modal yang TIDAK BISA ditutup — muncul saat penjoki login tapi
 * belum ada nomor WhatsApp tersimpan di profil.
 * Satu-satunya cara menutup: klik "Pergi ke Profil".
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MissingWhatsappDialog() {
  const router = useRouter();

  // Blokir scroll body saat dialog terbuka
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Cegah tombol ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  function goToProfile() {
    router.push("/profile");
  }

  return (
    <>
      {/* Backdrop — tidak bisa diklik */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="missing-wa-title"
        aria-describedby="missing-wa-desc"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-3xl">
              📱
            </div>
          </div>

          {/* Title */}
          <h2
            id="missing-wa-title"
            className="text-xl font-bold text-center text-gray-900 dark:text-gray-50"
          >
            Nomor WhatsApp Belum Ada
          </h2>

          {/* Description */}
          <p
            id="missing-wa-desc"
            className="text-sm text-center text-gray-600 dark:text-gray-400"
          >
            Sebagai penjoki, kamu <strong>wajib</strong> mengisi nomor WhatsApp. Nomor ini
            digunakan oleh customer untuk mengirimkan bukti pembayaran kepada kamu.
          </p>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 text-xs text-amber-800 dark:text-amber-300">
            ⚠️ Kamu tidak bisa menerima atau memproses pesanan apapun sampai nomor WhatsApp diisi.
          </div>

          {/* CTA — satu-satunya cara keluar dari dialog */}
          <button
            type="button"
            onClick={goToProfile}
            className="btn btn-primary w-full text-sm"
            autoFocus
          >
            Pergi ke Profil →
          </button>
        </div>
      </div>
    </>
  );
}
