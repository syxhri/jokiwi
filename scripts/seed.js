// scripts/seed.js
//
// Reset db.json dan isi dengan data dummy
// yang sudah punya kategori + tanggal disuruh + deadline.

import { JSONFilePreset } from 'lowdb/node';

async function main() {
  const defaultData = {
    orders: [],
    categories: [],
    meta: {
      nextOrderId: 1,
      nextCategoryId: 1,
    },
  };

  const db = await JSONFilePreset('db.json', defaultData);

  // --- definisi kategori ---
  const categories = [
    {
      id: 1,
      name: 'Algoritma',
      description: 'Tugas-tugas terkait algoritma & struktur data',
      notes: '',
    },
    {
      id: 2,
      name: 'Basis Data',
      description: 'Tugas mata kuliah basis data',
      notes: '',
    },
    {
      id: 3,
      name: 'RPL',
      description: 'Rekayasa Perangkat Lunak / RPLF',
      notes: '',
    },
    {
      id: 4,
      name: 'Literasi Digital',
      description: 'Tugas literasi digital / LD-15',
      notes: '',
    },
  ];

  // --- definisi orders (mirip contoh yang kamu kasih) ---
  const orders = [
    {
      id: 1,
      client_name: 'Rina Melati',
      task_name: 'Algoritma Struktur Data',
      categoryId: 1,
      category_name: 'Algoritma',
      price: 250000,
      is_done: false,
      is_paid: false,
      notes: 'Bayar nyicil',
      created_at: new Date().toISOString(),
      assigned_date: '2026-01-01',
      deadline_date: '2026-01-03',
    },
    {
      id: 2,
      client_name: 'Andi Wijaya',
      task_name: 'Basis Data 3',
      categoryId: 2,
      category_name: 'Basis Data',
      price: 300000,
      is_done: false,
      is_paid: true,
      notes: 'Deadline 2 minggu',
      created_at: new Date().toISOString(),
      assigned_date: '2026-01-02',
      deadline_date: '2026-01-08',
    },
    {
      id: 3,
      client_name: 'Siti Aisyah',
      task_name: 'Format RPLF',
      categoryId: 3,
      category_name: 'RPL',
      price: 200000,
      is_done: true,
      is_paid: false,
      notes: 'Utang 50%',
      created_at: new Date().toISOString(),
      assigned_date: '2026-01-03',
      deadline_date: '2026-01-09',
    },
    {
      id: 4,
      client_name: 'Budi Santoso',
      task_name: 'Literasi Digital LD-15',
      categoryId: 4,
      category_name: 'Literasi Digital',
      price: 150000,
      is_done: true,
      is_paid: true,
      notes: 'Selesai tepat waktu',
      created_at: new Date().toISOString(),
      assigned_date: '2026-01-04',
      deadline_date: '2026-01-10',
    },
  ];

  db.data.orders = orders;
  db.data.categories = categories;
  db.data.meta = {
    nextOrderId: orders.length + 1,
    nextCategoryId: categories.length + 1,
  };

  await db.write();
  console.log('Database seeded with dummy categories & orders.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
