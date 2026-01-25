# Jokiwi 🎓
Catat jokianmu biar ga berantakan — client, tugas, harga, status, sampai QRIS & struk otomatis.

Minimalis, cepat, dan enak dipake di HP.

---

## About Jokiwi
Jokiwi adalah web app buat ngatur orderan joki (tugas sekolah, kuliah, sampai joki game):
mulai dari nyatat client, tugas, kategori/mata kuliah, harga, status pengerjaan & pembayaran, serta generate QRIS dan struk otomatis (PNG / PDF).

Project ini dibuat biar workflow jokian lebih rapi dan ga ribet.

---

## Fitur
- Dashboard orderan (search, filter, sort)
- Kategori / mata kuliah per order
- Status pengerjaan & pembayaran
- QRIS sekali klik per order
- Struk pembayaran otomatis (PNG & PDF)
- Bot API (API khusus bot WhatsApp)
- Rate limiting (anti spam login & API)

---

## Tech Stack
- Next.js (App Router)
- Tailwind CSS
- Puppeteer (puppeteer-core)
- @sparticuz/chromium
- Upstash Redis + @upstash/ratelimit

---

## Cara Jalanin di Local
Pastikan Node.js versi LTS.

```bash
git clone https://github.com/syxhri/jokiwi.git
cd jokiwi
npm install
npm run dev
```

Akses:
http://localhost:3000

---

## Environment Variables
Minimal yang biasanya dipake:

```APP_URL=http://localhost:3000```

Untuk auth & database, bisa cek langsung di:
- lib/auth.js
- lib/db.js
- lib/bot.js

Nama env bisa beda tergantung implementasi.

### Upstash Redis (Rate Limit)
Kalo connect redis lewat Vercel, env biasanya otomatis muncul:

```env
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
REDIS_URL=
```

Di code cukup pakai:
```js
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
```
atau:
```js
const redis = Redis.fromEnv();
```
kalo redis nya langsung dari upstash.

---

## Rate Limiting
Digunakan buat mencegah abuse:
- Login / Register: contoh 5x per 10 menit per IP
- API umum: contoh 80x per menit per IP

---

## Receipt / Struk
Halaman print [WIP]:
/print/receipt/[orderCode]

Bot API (hanya bisa diakses oleh bot):
/api/bot/order/[orderCode]/receipt?format=png
/api/bot/order/[orderCode]/receipt?format=pdf

---

## Deploy (Vercel)
1. Import repo ke Vercel
2. Set environment variables
3. Deploy

---

## License
MIT
