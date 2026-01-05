// scripts/seed.js

/**
 * Reset and seed the PostgreSQL database with sample users,
 * categories and orders. This script utilises the data layer
 * functions provided by lib/db.js. To run it execute
 * `npm run seed` after installing dependencies. Seed data is
 * deliberately simple and small to demonstrate multi-user
 * functionality without bloating the repository. Passwords are
 * stored in plain text for demonstration only; do not use this
 * approach in production.
 */

import {
  getPool,
  createUser,
  createCategory,
  createOrder,
} from '../lib/db.js';

async function main() {
  console.log('Resetting and seeding database...');
  // Clear existing data from PostgreSQL and reset sequences
  const pool = getPool();
  // TRUNCATE will remove all rows and reset serial sequences. CASCADE ensures
  // dependent rows are removed in the correct order.
  await pool.query('TRUNCATE orders, categories, users RESTART IDENTITY CASCADE');

  // Create sample users
  const alice = await createUser({ username: 'alice', password: 'password', name: 'Alice' });
  const bob = await createUser({ username: 'bob', password: 'password', name: 'Bob' });

  // Create categories for Alice
  const catAlgo = await createCategory(alice.id, {
    name: 'Algoritma',
    description: 'Tugas algoritma & struktur data',
    notes: '',
  });
  const catDatabase = await createCategory(alice.id, {
    name: 'Basis Data',
    description: 'Tugas mata kuliah basis data',
    notes: '',
  });
  const catRPL = await createCategory(alice.id, {
    name: 'RPL',
    description: 'Rekayasa Perangkat Lunak / RPLF',
    notes: '',
  });
  const catLiterasi = await createCategory(alice.id, {
    name: 'Literasi Digital',
    description: 'Tugas literasi digital',
    notes: '',
  });

  // Create orders for Alice
  await createOrder(alice.id, {
    client_name: 'Rina Melati',
    task_name: 'Algoritma Struktur Data',
    categoryId: catAlgo.id,
    price: 250000,
    is_done: false,
    is_paid: false,
    notes: 'Bayar nyicil',
    assigned_date: '2026-01-01',
    deadline_date: '2026-01-03',
  });
  await createOrder(alice.id, {
    client_name: 'Andi Wijaya',
    task_name: 'Basis Data 3',
    categoryId: catDatabase.id,
    price: 300000,
    is_done: false,
    is_paid: true,
    notes: 'Deadline 2 minggu',
    assigned_date: '2026-01-02',
    deadline_date: '2026-01-08',
  });
  await createOrder(alice.id, {
    client_name: 'Siti Aisyah',
    task_name: 'Format RPLF',
    categoryId: catRPL.id,
    price: 200000,
    is_done: true,
    is_paid: false,
    notes: 'Utang 50%',
    assigned_date: '2026-01-03',
    deadline_date: '2026-01-09',
  });
  await createOrder(alice.id, {
    client_name: 'Budi Santoso',
    task_name: 'Literasi Digital LD-15',
    categoryId: catLiterasi.id,
    price: 150000,
    is_done: true,
    is_paid: true,
    notes: 'Selesai tepat waktu',
    assigned_date: '2026-01-04',
    deadline_date: '2026-01-10',
  });

  // Bob has his own categories and orders (demonstrating multi-user isolation)
  const catBob = await createCategory(bob.id, {
    name: 'Matematika',
    description: 'Tugas hitung-hitungan',
    notes: '',
  });
  await createOrder(bob.id, {
    client_name: 'Charlie',
    task_name: 'Kalkulus 1',
    categoryId: catBob.id,
    price: 100000,
    is_done: false,
    is_paid: false,
    notes: '',
    assigned_date: '2026-01-05',
    deadline_date: '2026-01-12',
  });

  console.log('Seeding completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});