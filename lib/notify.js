/**
 * lib/notify.js
 * Abstraksi notifikasi — in-app + Web Push.
 * [FUTURE] Tambahkan WhatsApp via Baileys bot API di sini.
 */

import { sendPush } from "./webpush.js";
import {
  createNotification,
  getPushSubscription,
  getPool,
} from "./db.js";

// ─── Tipe notifikasi ───────────────────────────────────────────
// 'order_placed'       - customer baru pasang order
// 'order_accepted'     - penjoki terima order
// 'order_rejected'     - penjoki tolak order
// 'result_ready'       - penjoki upload hasil, customer bisa download
// 'payment_reminder'   - pengingat bayar ke customer
// 'payment_confirmed'  - penjoki konfirmasi bayar
// ──────────────────────────────────────────────────────────────

const MESSAGES = {
  order_placed: (data) => ({
    title: "📦 Pesanan Baru!",
    body: `${data.customerName || "Seseorang"} memesan: ${data.taskName || ""}`,
    url: `/orders`,
  }),
  order_accepted: (data) => ({
    title: "✅ Pesanan Diterima!",
    body: `Pesanan kamu diterima. Harga: Rp ${Number(data.price || 0).toLocaleString("id-ID")}${data.estimatedHours ? `, estimasi ${data.estimatedHours} jam` : ""}. Silakan selesaikan pembayaran.`,
    url: `/track/${data.orderCode}`,
  }),
  order_rejected: (data) => ({
    title: "❌ Pesanan Ditolak",
    body: `Mohon maaf, pesanan kamu tidak dapat kami terima saat ini.`,
    url: `/track/${data.orderCode}`,
  }),
  result_ready: (data) => ({
    title: "🎉 Hasil Pengerjaan Siap!",
    body: data.isPaid
      ? `Hasil joki kamu sudah selesai dan siap didownload!`
      : `Hasil joki kamu sudah selesai. Selesaikan pembayaran untuk download.`,
    url: `/track/${data.orderCode}`,
  }),
  payment_reminder: (data) => ({
    title: "💳 Pengingat Pembayaran",
    body: `Jangan lupa selesaikan pembayaran Rp ${Number(data.price || 0).toLocaleString("id-ID")} untuk pesanan "${data.taskName || ""}".`,
    url: `/track/${data.orderCode}`,
  }),
  payment_confirmed: (data) => ({
    title: "✅ Pembayaran Dikonfirmasi!",
    body: `Pembayaran kamu sudah dikonfirmasi. Silakan download hasil pekerjaan kamu!`,
    url: `/track/${data.orderCode}`,
  }),
};

/**
 * Kirim notifikasi ke PENJOKI (in-app + web push).
 * @param {number} jokiUserId - user ID penjoki
 * @param {number} orderId - ID order
 * @param {string} type - tipe notif
 * @param {object} data - data tambahan untuk pesan
 */
export async function notifyJoki(jokiUserId, orderId, type, data = {}) {
  const msgFn = MESSAGES[type];
  if (!msgFn) return;

  const msg = msgFn(data);

  // 1. Simpan ke tabel notifications (in-app bell)
  try {
    await createNotification(jokiUserId, orderId, type, msg.body);
  } catch (err) {
    console.error("[Notify] createNotification error:", err.message);
  }

  // 2. Web push ke penjoki
  try {
    const subJson = await getPushSubscription(jokiUserId);
    if (subJson) {
      await sendPush(subJson, msg);
    }
  } catch (err) {
    console.error("[Notify] Web push joki error:", err.message);
  }

  // [FUTURE] 3. WhatsApp via Baileys bot API
  // await sendWhatsApp(jokiPhone, msg.body);
}

/**
 * Kirim notifikasi ke CUSTOMER (web push saja — tidak punya akun).
 * @param {string|null} pushTokenJson - customer_push_token dari order
 * @param {string} type - tipe notif
 * @param {object} data - data tambahan
 */
export async function notifyCustomer(pushTokenJson, type, data = {}) {
  if (!pushTokenJson) return; // Customer belum subscribe push

  const msgFn = MESSAGES[type];
  if (!msgFn) return;

  const msg = msgFn(data);

  try {
    await sendPush(pushTokenJson, msg);
  } catch (err) {
    console.error("[Notify] Web push customer error:", err.message);
  }

  // [FUTURE] 4. WhatsApp via Baileys bot API menggunakan customer_phone
  // await sendWhatsApp(customerPhone, msg.body);
}
