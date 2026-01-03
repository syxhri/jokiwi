// lib/db.js
//
// DB ringan berbasis JSON pakai lowdb.
// Menyimpan 2 koleksi: orders dan categories.

import { JSONFilePreset } from 'lowdb/node';

let dbPromise;

/**
 * Inisialisasi DB jika belum ada.
 */
async function getDb() {
  if (!dbPromise) {
    const defaultData = {
      orders: [],
      categories: [],
      meta: {
        nextOrderId: 1,
        nextCategoryId: 1,
      },
    };
    dbPromise = JSONFilePreset('db.json', defaultData);
  }

  const db = await dbPromise;

  // safety net kalau file lama belum punya field2 ini
  db.data.orders ??= [];
  db.data.categories ??= [];
  db.data.meta ??= { nextOrderId: 1, nextCategoryId: 1 };

  await db.write();
  return db;
}

async function getNextId(kind) {
  const db = await getDb();
  const key = kind === 'category' ? 'nextCategoryId' : 'nextOrderId';
  const current = db.data.meta[key] ?? 1;
  db.data.meta[key] = current + 1;
  await db.write();
  return current;
}

// ---------- Util umum ----------

export function computeStats(orders) {
  const totalPaid = orders.reduce(
    (sum, o) => sum + (o.is_paid ? Number(o.price) || 0 : 0),
    0,
  );

  const totalUnpaid = orders.reduce(
    (sum, o) => sum + (!o.is_paid ? Number(o.price) || 0 : 0),
    0,
  );

  // Pendapatan = yang sudah dibayar saja
  const totalIncome = totalPaid;

  return {
    totalIncome,
    totalPaid,
    totalUnpaid,
    totalOrders: orders.length,
  };
}

function matchesSearch(order, search) {
  if (!search) return true;
  const q = search.toLowerCase();
  return (
    order.client_name?.toLowerCase().includes(q) ||
    order.task_name?.toLowerCase().includes(q) ||
    order.category_name?.toLowerCase().includes(q) ||
    order.notes?.toLowerCase().includes(q)
  );
}

function matchesBool(value, filterStr) {
  if (!filterStr || filterStr === 'all') return true;
  const expected = filterStr === 'true';
  return Boolean(value) === expected;
}

function matchesCategory(order, categoryId) {
  if (!categoryId) return true;
  return order.categoryId === Number(categoryId);
}

function sortOrders(list, sortBy, sortDir) {
  const dir = sortDir === 'asc' ? 1 : -1;
  const key = sortBy || 'assigned_date';

  return list.slice().sort((a, b) => {
    let va = a[key];
    let vb = b[key];

    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;

    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * dir;
    }

    // untuk tanggal string "YYYY-MM-DD" aman pakai compare string
    if (typeof va === 'string' && typeof vb === 'string') {
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    }

    return 0;
  });
}

// ---------- Orders ----------

export async function getAllOrders() {
  const db = await getDb();
  return db.data.orders.slice();
}

export async function filterOrders({
  search,
  isDone,
  isPaid,
  categoryId,
  sortBy,
  sortDir,
}) {
  const db = await getDb();
  let orders = db.data.orders.filter(
    (o) =>
      matchesSearch(o, search) &&
      matchesBool(o.is_done, isDone) &&
      matchesBool(o.is_paid, isPaid) &&
      matchesCategory(o, categoryId),
  );

  orders = sortOrders(orders, sortBy, sortDir);
  return orders;
}

export async function findOrder(id) {
  const db = await getDb();
  return db.data.orders.find((o) => o.id === Number(id)) ?? null;
}

export async function createOrder(payload) {
  const db = await getDb();
  const id = await getNextId('order');
  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);

  const {
    client_name,
    task_name,
    categoryId,
    price = 0,
    is_done = false,
    is_paid = false,
    notes = '',
    assigned_date,
    deadline_date,
  } = payload;

  const catId = categoryId ? Number(categoryId) : null;
  const category =
    catId != null
      ? db.data.categories.find((c) => c.id === catId) ?? null
      : null;

  const order = {
    id,
    client_name: client_name?.trim() || '',
    task_name: task_name?.trim() || '',
    categoryId: category?.id ?? null,
    category_name: category?.name ?? '',
    price: Number(price) || 0,
    is_done: Boolean(is_done),
    is_paid: Boolean(is_paid),
    notes: notes || '',
    created_at: now.toISOString(),
    assigned_date: assigned_date || isoDate,
    deadline_date: deadline_date || '',
  };

  db.data.orders.push(order);
  await db.write();
  return order;
}

export async function updateOrder(id, patch) {
  const db = await getDb();
  const index = db.data.orders.findIndex((o) => o.id === Number(id));
  if (index === -1) return null;

  const prev = db.data.orders[index];

  let categoryId = prev.categoryId;
  let category_name = prev.category_name;

  if (patch.categoryId !== undefined) {
    const catId = patch.categoryId ? Number(patch.categoryId) : null;
    const category =
      catId != null
        ? db.data.categories.find((c) => c.id === catId) ?? null
        : null;

    categoryId = category?.id ?? null;
    category_name = category?.name ?? '';
  }

  const updated = {
    ...prev,
    ...patch,
    categoryId,
    category_name,
    price:
      patch.price !== undefined ? Number(patch.price) || 0 : prev.price,
    is_done:
      patch.is_done !== undefined ? Boolean(patch.is_done) : prev.is_done,
    is_paid:
      patch.is_paid !== undefined ? Boolean(patch.is_paid) : prev.is_paid,
  };

  db.data.orders[index] = updated;
  await db.write();
  return updated;
}

export async function deleteOrder(id) {
  const db = await getDb();
  const before = db.data.orders.length;
  db.data.orders = db.data.orders.filter((o) => o.id !== Number(id));
  const changed = db.data.orders.length !== before;
  if (changed) await db.write();
  return changed;
}

// ---------- Categories ----------

export async function getAllCategories() {
  const db = await getDb();
  return db.data.categories.slice();
}

export async function findCategory(id) {
  const db = await getDb();
  return db.data.categories.find((c) => c.id === Number(id)) ?? null;
}

export async function createCategory(payload) {
  const db = await getDb();
  const id = await getNextId('category');

  const category = {
    id,
    name: payload.name?.trim() || 'Tanpa Nama',
    description: payload.description || '',
    notes: payload.notes || '',
  };

  db.data.categories.push(category);
  await db.write();
  return category;
}

export async function updateCategory(id, patch) {
  const db = await getDb();
  const index = db.data.categories.findIndex((c) => c.id === Number(id));
  if (index === -1) return null;

  const prev = db.data.categories[index];
  const updated = {
    ...prev,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() : prev.name,
  };

  db.data.categories[index] = updated;

  // sinkron nama kategori di orders
  db.data.orders = db.data.orders.map((o) =>
    o.categoryId === updated.id ? { ...o, category_name: updated.name } : o,
  );

  await db.write();
  return updated;
}

export async function deleteCategory(id) {
  const db = await getDb();

  const hasOrders = db.data.orders.some(
    (o) => o.categoryId === Number(id),
  );
  if (hasOrders) {
    throw new Error(
      'Kategori masih memiliki order. Hapus atau pindahkan order terlebih dahulu.',
    );
  }

  db.data.categories = db.data.categories.filter(
    (c) => c.id !== Number(id),
  );
  await db.write();
  return true;
}
