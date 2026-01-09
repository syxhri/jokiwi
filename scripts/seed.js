import { getPool, createUser, createCategory, createOrder } from "../lib/db.js";

async function main() {
  console.log("Resetting and seeding database...");
  const pool = getPool();
  await pool.query(
    "TRUNCATE orders, categories, users RESTART IDENTITY CASCADE"
  );

  const abdul = await createUser({
    username: "abdul",
    password: "suu123",
    name: "Abdul",
  });
  const suci = await createUser({
    username: "suci",
    password: "abb456",
    name: "Suci",
  });

  const catAlgo = await createCategory(abdul.id, {
    name: "Algoritma",
    description: "Tugas algoritma & struktur data",
    notes: "",
  });
  const catDatabase = await createCategory(abdul.id, {
    name: "Basis Data",
    description: "Tugas mata kuliah basis data",
    notes: "",
  });
  const catRPLF = await createCategory(abdul.id, {
    name: "RPLF",
    description: "Rekayasa Perangkat Lunak Fundamental",
    notes: "",
  });
  const catLiterasi = await createCategory(abdul.id, {
    name: "Literasi Digital",
    description: "Tugas literasi digital",
    notes: "",
  });

  await createOrder(abdul.id, {
    client_name: "Refan Laurent",
    task_name: "Algoritma Struktur Data",
    categoryId: catAlgo.id,
    price: 250000,
    is_done: false,
    is_paid: false,
    notes: "Bayar nyicil",
    assigned_date: "2026-01-01",
    deadline_date: "2026-01-03",
  });
  await createOrder(abdul.id, {
    client_name: "Fachri Hexenzirkel",
    task_name: "Basis Data 3",
    categoryId: catDatabase.id,
    price: 300000,
    is_done: false,
    is_paid: true,
    notes: "Deadline 2 minggu",
    assigned_date: "2026-01-02",
    deadline_date: "2026-01-08",
  });
  await createOrder(abdul.id, {
    client_name: "Ridho Kaleident",
    task_name: "Format RPLF",
    categoryId: catRPLF.id,
    price: 200000,
    is_done: true,
    is_paid: false,
    notes: "Utang 50%",
    assigned_date: "2026-01-03",
    deadline_date: "2026-01-09",
  });
  await createOrder(abdul.id, {
    client_name: "Aldo Sam",
    task_name: "Literasi Digital LD-15",
    categoryId: catLiterasi.id,
    price: 150000,
    is_done: true,
    is_paid: true,
    notes: "Selesai tepat waktu",
    assigned_date: "2026-01-04",
    deadline_date: "2026-01-10",
  });

  const catsuci = await createCategory(suci.id, {
    name: "Matematika",
    description: "Tugas hitung-hitungan",
    notes: "",
  });
  await createOrder(suci.id, {
    client_name: "Anay Zalvation",
    task_name: "Kalkulus 1",
    categoryId: catsuci.id,
    price: 100000,
    is_done: false,
    is_paid: false,
    notes: "",
    assigned_date: "2026-01-05",
    deadline_date: "2026-01-12",
  });

  console.log("Seeding completed successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
