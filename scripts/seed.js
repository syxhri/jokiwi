// scripts/seed.js

/**
 * Seed the JSON-based database with sample data. This script uses
 * functions from lib/db.js to populate the database. To run it
 * execute `npm run seed` after installing dependencies. The sample
 * orders mirror those from the original Prisma seed script.
 */

import { createOrder, deleteOrder, getAllOrders } from '../lib/db.js';

async function main() {
  console.log('Seeding database...');
  // Clear existing orders by deleting all entries. Because lowdb
  // doesn't provide a direct method to drop a collection we simply
  // iterate over all ids and delete them.
  const current = await getAllOrders();
  for (const order of current) {
    await deleteOrder(order.id);
  }
  // Insert sample orders
  const sample = [
    {
      client_name: 'Budi Santoso',
      task_name: 'Literasi Digital LD-15',
      subject_or_category: 'Literasi Digital',
      price: 150000,
      is_done: true,
      is_paid: true,
      note: 'Selesai tepat waktu',
    },
    {
      client_name: 'Siti Aisyah',
      task_name: 'Format RPLF',
      subject_or_category: 'RPL',
      price: 200000,
      is_done: true,
      is_paid: false,
      note: 'Utang 50%',
    },
    {
      client_name: 'Andi Wijaya',
      task_name: 'Basis Data 3',
      subject_or_category: 'Basis Data',
      price: 300000,
      is_done: false,
      is_paid: true,
      note: 'Deadline 2 minggu',
    },
    {
      client_name: 'Rina Melati',
      task_name: 'Algoritma Struktur Data',
      subject_or_category: 'Algoritma',
      price: 250000,
      is_done: false,
      is_paid: false,
      note: 'Bayar nyicil',
    },
  ];
  for (const entry of sample) {
    await createOrder(entry);
  }
  console.log('Seeding completed!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});