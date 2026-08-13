# Jokiwi 🎓

Platform dua arah untuk joki tugas — customer bisa pesan, penjoki kelola dan kirim hasil.

---

## Tentang Jokiwi

Jokiwi adalah web app dua sisi:
- **Customer** — pesan joki tanpa akun, cukup isi nama & WhatsApp, lalu pantau status dan download hasil.
- **Penjoki** — dashboard lengkap: terima/tolak pesanan, tentukan harga, upload hasil, konfirmasi bayar.

Dilengkapi notifikasi Web Push (real-time), QRIS dinamis per order, dan file management otomatis.

---

## Fitur

### Untuk Penjoki
- Dashboard orderan (search, filter, sort)
- Kategori / mata kuliah per akun
- Terima/tolak pesanan customer — set harga + estimasi
- Upload hasil kerja (file bebas format, max 50 MB)
- Upload ulang file jika customer kehilangan
- Konfirmasi pembayaran manual (extensible ke payment gateway)
- Notifikasi in-app + Web Push saat ada pesanan baru
- QRIS sekali klik per order (with dynamic amount)
- Struk pembayaran otomatis (PNG & PDF)
- Rate limiting anti-abuse

### Untuk Customer (Tanpa Akun)
- Form pesan joki: pilih penjoki, isi detail tugas
- Tracking status via kode order (link persisten)
- Notifikasi Web Push saat pesanan diterima, selesai, atau butuh bayar
- Dialog petunjuk pembayaran + QRIS dinamis
- Download file hasil (hanya setelah lunas)
- File otomatis dihapus 15 menit setelah didownload

### Sistem
- Web Push Notifications (VAPID) — penjoki & customer
- Vercel Cron: payment reminder (30 mnt), file cleanup (5 mnt)
- Supabase Storage: file hasil joki
- Rate limiting (Upstash Redis)
- Auth JWT via cookie httpOnly

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Neon / Vercel Postgres) |
| Auth | JWT + bcrypt |
| Storage | Supabase Storage (private bucket) |
| Push Notif | Web Push API + VAPID (via `web-push`) |
| Rate Limit | Upstash Redis + `@upstash/ratelimit` |
| PDF/PNG | Puppeteer-core + @sparticuz/chromium |
| Deploy | Vercel (dengan Cron Jobs aktif) |

---

## Environment Variables

Buat file `.env.local` di root project:

```env
# ─── App ──────────────────────────────────────────
APP_URL=http://localhost:3000

# ─── Auth ─────────────────────────────────────────
JWT_SECRET=ganti_dengan_random_string_panjang_minimal_32_char

# ─── Database (Neon / Vercel Postgres) ───────────
POSTGRES_URL=postgresql://user:pass@host/dbname?sslmode=require
# atau gunakan salah satu dari:
# POSTGRES_PRISMA_URL=
# POSTGRES_URL_NON_POOLING=
# DATABASE_URL=

# ─── Supabase Storage ─────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key   # bukan anon key!
SUPABASE_BUCKET=order-results                # nama bucket (default: order-results)

# ─── Web Push (VAPID) ─────────────────────────────
# Generate sekali: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_MAILTO=mailto:admin@example.com

# ─── Upstash Redis (Rate Limit) ───────────────────
KV_REST_API_URL=
KV_REST_API_TOKEN=

# ─── Vercel Cron (opsional, untuk keamanan) ───────
CRON_SECRET=random_string_untuk_proteksi_cron
```

---

## Setup Supabase Storage

1. **Buat project di** [supabase.com](https://supabase.com)
2. **Buat bucket:**
   - Pergi ke **Storage** → **New bucket**
   - Nama: `order-results` (atau sesuaikan `SUPABASE_BUCKET`)
   - **Uncheck** "Public bucket" → bucket harus **Private**
3. **Ambil credentials:**
   - `SUPABASE_URL`: Settings → API → Project URL
   - `SUPABASE_SERVICE_KEY`: Settings → API → `service_role` key (**bukan anon key**)
4. **Set RLS Policy** (opsional, karena kita pakai service key):
   - Dengan service key, RLS bisa dibiarkan disable untuk bucket ini
   - Atau buat policy: "Allow service role all"
5. **Batasan free tier:**
   - Storage: 1 GB total
   - Max file size: 50 MB per file
   - Bandwidth: 2 GB/bulan

---

## Setup Vercel Cron

1. **Deploy ke Vercel** (minimal Hobby plan — cron gratis 1 job, Pro untuk lebih)
2. **Vercel Cron** dikonfigurasi di `vercel.json`:
   ```json
   {
     "crons": [
       { "path": "/api/cron/payment-reminder", "schedule": "*/30 * * * *" },
       { "path": "/api/cron/cleanup-files", "schedule": "*/5 * * * *" }
     ]
   }
   ```
3. **Proteksi cron:** Set `CRON_SECRET` di env Vercel. Vercel otomatis kirim header `Authorization: Bearer <CRON_SECRET>` ke endpoint cron.
4. Cek log cron di **Vercel Dashboard → Logs → Cron**.

---

## Setup Web Push (VAPID)

```bash
# Generate VAPID keys sekali — simpan hasilnya di .env
npx web-push generate-vapid-keys
```

Hasilnya:
```
Public Key: BCxxxxxxxxxxxxxxxx...
Private Key: xxxxxxxxxxxxxxxxxx...
```

Set ke env:
```env
VAPID_PUBLIC_KEY=BCxxxxxxxxxxxxxxxx...
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxx...
VAPID_MAILTO=mailto:admin@example.com
```

Service worker sudah ada di `public/sw.js` — otomatis diregister di halaman `/track/[orderCode]` dan dashboard penjoki.

---

## Cara Jalanin di Local

```bash
git clone https://github.com/syxhri/jokiwi.git
cd jokiwi
npm install

# Salin dan isi env
cp .env.example .env.local   # atau buat manual

npm run dev
```

Akses: http://localhost:3000

---

## Struktur Route

| Route | Akses | Deskripsi |
|-------|-------|-----------|
| `/` | Publik | Landing / dashboard penjoki |
| `/book` | Publik | Form pesan joki (customer) |
| `/track` | Publik | Input kode order |
| `/track/[orderCode]` | Publik | Tracking + download hasil |
| `/login` | Publik | Login penjoki |
| `/register` | Publik | Register penjoki |
| `/orders` | Joki | Dashboard semua orderan |
| `/orders/[id]` | Joki | Detail & edit order |
| `/categories` | Joki | Kelola kategori |
| `/profile` | Joki | Profil, QRIS, WhatsApp |
| `/print/receipt/[id]` | Joki | Struk pembayaran |

### API Routes Utama

| Endpoint | Method | Akses | Fungsi |
|----------|--------|-------|--------|
| `/api/customer/orders` | GET | Publik | List penjoki / kategori |
| `/api/customer/orders` | POST | Publik | Buat pesanan baru |
| `/api/customer/orders/[code]` | GET | Publik | Status pesanan |
| `/api/customer/orders/[code]/download` | GET | Publik | Download file hasil |
| `/api/customer/orders/[code]/push-subscribe` | POST | Publik | Subscribe push notif |
| `/api/order/[id]/accept` | POST | Joki | Terima pesanan |
| `/api/order/[id]/reject` | POST | Joki | Tolak pesanan |
| `/api/order/[id]/upload` | POST | Joki | Upload hasil |
| `/api/order/[id]/reupload` | POST | Joki | Upload ulang hasil |
| `/api/order/[id]/confirm-payment` | POST | Joki | Konfirmasi bayar |
| `/api/notifications` | GET | Joki | Ambil notifikasi |
| `/api/notifications` | PATCH | Joki | Mark semua dibaca |
| `/api/push/subscribe` | POST | Joki | Subscribe push notif |
| `/api/profile/whatsapp` | PATCH | Joki | Update nomor WA |
| `/api/cron/payment-reminder` | GET | Cron | Kirim reminder bayar |
| `/api/cron/cleanup-files` | GET | Cron | Hapus file expired |

---

## Alur Sistem

```
Customer → /book → Pilih Penjoki → Isi Form → POST /api/customer/orders
                                                       ↓
                                          Notif Web Push ke Penjoki 🔔
                                                       ↓
Penjoki → Dashboard → Accept (set harga + estimasi) → Notif ke Customer
                 └──→ Reject → Notif ke Customer
                                                       ↓ (accepted)
Penjoki → Upload file → Storage Supabase → Notif ke Customer
                                                       ↓
Customer → /track/[code] → Cek status → Dialog bayar + QRIS
                                                       ↓ (sudah bayar)
Penjoki → Konfirmasi bayar → Notif ke Customer 🔔
                                                       ↓
Customer → Download file → File terjadwal hapus 15 mnt
```

---

## Alur Pembayaran (Manual)

1. Customer download halaman tracking — muncul dialog petunjuk + QRIS
2. Customer transfer lewat QRIS atau transfer manual
3. Customer **kirim bukti bayar** via WhatsApp ke nomor penjoki (link otomatis tersedia)
4. Penjoki verifikasi manual → klik "Konfirmasi Bayar" di dashboard
5. Customer terima notifikasi → bisa download file

> 💡 Endpoint `POST /api/order/[id]/confirm-payment` sudah disiapkan agar bisa diintegrasikan dengan webhook payment gateway di masa depan.

---

## Database

Skema diinisialisasi otomatis saat app pertama kali berjalan (`initDb()` di `lib/db.js`).
Kolom baru ditambahkan dengan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — aman untuk existing database.

### Tabel utama

- `users` — penjoki (username, password_hash, whatsapp_phone, qris_payload, role)
- `categories` — kategori per penjoki
- `orders` — semua order (manual & customer), dengan status, file info, payment info
- `notifications` — in-app notif untuk penjoki
- `push_subscriptions` — subscription Web Push penjoki

---

## Deploy (Vercel)

1. **Import repo** ke [vercel.com](https://vercel.com)
2. **Set semua environment variables** (lihat bagian Environment Variables di atas)
3. **Hubungkan Vercel Postgres** (atau Neon): Settings → Integrations
4. **Hubungkan Upstash Redis**: Settings → Integrations → Upstash
5. **Klik Deploy**
6. **Cek Cron** aktif di: Settings → Cron Jobs

### Penting setelah deploy
- Pastikan `SUPABASE_SERVICE_KEY` (bukan anon key) sudah diset
- Pastikan bucket Supabase sudah dibuat dan **Private**
- Generate VAPID keys dan set ke env Vercel
- Set `CRON_SECRET` agar endpoint cron aman

---

## License

MIT
