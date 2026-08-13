/**
 * lib/webpush.js
 * Web Push notification helper menggunakan VAPID keys.
 *
 * Setup: generate VAPID keys sekali dengan:
 *   npx web-push generate-vapid-keys
 * Simpan di env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_MAILTO
 */

import webpush from "web-push";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const mailto = process.env.VAPID_MAILTO;

  if (!publicKey || !privateKey || !mailto) {
    console.warn(
      "[WebPush] VAPID keys not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_MAILTO in env."
    );
    return;
  }

  webpush.setVapidDetails(mailto, publicKey, privateKey);
  vapidConfigured = true;
}

/**
 * Kirim push notification ke satu subscription.
 * @param {string} subscriptionJson - JSON string dari PushSubscription browser
 * @param {{ title: string, body: string, url?: string, icon?: string }} payload
 */
export async function sendPush(subscriptionJson, payload) {
  ensureVapid();
  if (!vapidConfigured) return; // Gagal silent jika tidak dikonfigurasi

  let subscription;
  try {
    subscription =
      typeof subscriptionJson === "string"
        ? JSON.parse(subscriptionJson)
        : subscriptionJson;
  } catch {
    console.warn("[WebPush] Invalid subscription JSON");
    return;
  }

  if (!subscription?.endpoint) return;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    icon: payload.icon || "/icon-192.png",
    badge: "/badge-72.png",
  });

  try {
    await webpush.sendNotification(subscription, notificationPayload);
  } catch (err) {
    // 410 = subscription expired/unsubscribed — bisa dihapus dari DB
    if (err.statusCode === 410) {
      console.log("[WebPush] Subscription expired (410):", subscription.endpoint);
    } else {
      console.error("[WebPush] Send error:", err.message);
    }
  }
}

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
