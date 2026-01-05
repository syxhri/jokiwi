// lib/db.js

/**
 * Database layer for the Jokiwi application.
 *
 * This module provides typed functions for managing users, categories and
 * orders using a PostgreSQL database. Tables are automatically
 * initialised on first access. Each record belongs to a specific user
 * (identified by userId) allowing multi-user isolation. Helper
 * functions return plain JavaScript objects with camelCase keys to
 * maintain compatibility with the rest of the application.
 */

import { Pool } from "pg";
import bcrypt from "bcryptjs";

/**
 * Build pg connection options.
 *
 * Why: For Supabase + Vercel, TLS verification can fail with
 * "self-signed certificate in certificate chain". The more correct
 * fix is to use the CA certificate provided by the integration (DATABASE_CA),
 * and avoid relying solely on a URL that can override SSL config in some stacks.
 *
 * Priority:
 * 1) If split credentials exist (DATABASE_* or POSTGRES_*), use them + CA.
 * 2) Else fallback to connectionString (POSTGRES_URL or DATABASE_URL).
 */
function buildPoolConfig() {
  // Support both naming styles:
  // - Supabase integration often provides DATABASE_HOST/PORT/USER/PASSWORD/NAME + DATABASE_CA
  // - Vercel/Supabase marketplace often provides POSTGRES_HOST/... + sometimes POSTGRES_CA
  const host = process.env.DATABASE_HOST || process.env.POSTGRES_HOST;
  const portRaw = process.env.DATABASE_PORT || process.env.POSTGRES_PORT;
  const user = process.env.DATABASE_USER || process.env.POSTGRES_USER;
  const password =
    process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD;
  const database = process.env.DATABASE_NAME || process.env.POSTGRES_DATABASE;

  const ca = process.env.DATABASE_CA || process.env.POSTGRES_CA;

  const hasSplitCreds = !!(host && portRaw && user && password && database);

  if (hasSplitCreds) {
    const port = Number.parseInt(String(portRaw), 10);

    const cfg = {
      host,
      port: Number.isFinite(port) ? port : 5432,
      user,
      password,
      database,
      // Use CA if available; otherwise fallback to no-verify SSL in production-ish envs.
      ssl: ca
        ? { ca: String(ca) }
        : process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    };

    return cfg;
  }

  // Fallback: use URL
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Database env vars not set. Provide split creds (DATABASE_* / POSTGRES_*) or POSTGRES_URL / DATABASE_URL."
    );
  }

  // If SSL required, allow it via POSTGRES_SSL=true.
  // For Supabase on Vercel, production usually needs SSL.
  const shouldUseSsl =
    process.env.POSTGRES_SSL === "true" ||
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production";

  return {
    connectionString,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  };
}

// Create a connection pool.
const pool = new Pool(buildPoolConfig());

// Promise used to serialise initialisation of the database. The first call to
// initDb will create any missing tables. Subsequent calls reuse the same
// promise to prevent concurrent initialisation.
let initPromise;

async function initDb() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT NOT NULL,
      qris_payload TEXT
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      notes TEXT
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_name TEXT,
      task_name TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      category_name TEXT,
      price NUMERIC,
      is_done BOOLEAN,
      is_paid BOOLEAN,
      notes TEXT,
      created_at TIMESTAMPTZ,
      assigned_date DATE,
      deadline_date DATE
    )`);
  })();
  return initPromise;
}

// -----------------------------------------------------------------------------
// User functions
// -----------------------------------------------------------------------------

export async function findUserByUsername(username) {
  await initDb();
  const res = await pool.query(
    "SELECT id, username, name, password_hash, qris_payload FROM users WHERE username = $1 LIMIT 1",
    [username]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

export async function findUserById(id) {
  await initDb();
  const res = await pool.query(
    "SELECT id, username, name, password_hash, qris_payload FROM users WHERE id = $1 LIMIT 1",
    [Number(id)]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

export async function createUser({ username, password, name = "" }) {
  await initDb();
  const existing = await findUserByUsername(username);
  if (existing) {
    throw new Error("Username already exists");
  }
  const passwordHash = await bcrypt.hash(String(password), 10);
  const res = await pool.query(
    "INSERT INTO users (username, name, password_hash) VALUES ($1, $2, $3) RETURNING id, username, name, password_hash, qris_payload",
    [username, name, passwordHash]
  );
  const row = res.rows[0];
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

export async function verifyUserPassword(user, password) {
  if (!user) return false;
  const raw = String(password);
  if (!user.passwordHash) return false;
  return bcrypt.compare(raw, String(user.passwordHash));
}

export async function setUserQrisPayload(userId, qrisPayload) {
  await initDb();
  const res = await pool.query(
    "UPDATE users SET qris_payload = $1 WHERE id = $2 RETURNING id, username, name, password_hash, qris_payload",
    [qrisPayload ? String(qrisPayload).trim() : null, Number(userId)]
  );
  const row = res.rows[0];
  if (!row) throw new Error("User not found");
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

// -----------------------------------------------------------------------------
// Category functions
// -----------------------------------------------------------------------------

export async function getAllCategoriesForUser(userId) {
  await initDb();
  const res = await pool.query(
    "SELECT id, user_id, name, description, notes FROM categories WHERE user_id = $1 ORDER BY name ASC",
    [Number(userId)]
  );
  return res.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    notes: row.notes,
  }));
}

export async function findCategory(userId, id) {
  await initDb();
  const res = await pool.query(
    "SELECT id, user_id, name, description, notes FROM categories WHERE id = $1 AND user_id = $2 LIMIT 1",
    [Number(id), Number(userId)]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    notes: row.notes,
  };
}

export async function createCategory(
  userId,
  { name, description = "", notes = "" }
) {
  await initDb();
  const trimmedName = name.trim();
  const res = await pool.query(
    "INSERT INTO categories (user_id, name, description, notes) VALUES ($1, $2, $3, $4) RETURNING id, user_id, name, description, notes",
    [Number(userId), trimmedName, description, notes]
  );
  const row = res.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    notes: row.notes,
  };
}

export async function updateCategory(userId, id, patch) {
  await initDb();
  const current = await findCategory(userId, id);
  if (!current) return null;
  const updated = {
    name: patch.name !== undefined ? String(patch.name).trim() : current.name,
    description:
      patch.description !== undefined ? patch.description : current.description,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
  };
  await pool.query(
    "UPDATE categories SET name = $1, description = $2, notes = $3 WHERE id = $4 AND user_id = $5",
    [
      updated.name,
      updated.description,
      updated.notes,
      Number(id),
      Number(userId),
    ]
  );
  if (patch.name !== undefined) {
    await pool.query(
      "UPDATE orders SET category_name = $1 WHERE category_id = $2 AND user_id = $3",
      [updated.name, Number(id), Number(userId)]
    );
  }
  return { ...current, ...updated };
}

export async function deleteCategory(userId, id) {
  await initDb();
  const cat = await findCategory(userId, id);
  if (!cat) return false;

  const check = await pool.query(
    "SELECT 1 FROM orders WHERE user_id = $1 AND category_id = $2 LIMIT 1",
    [Number(userId), Number(id)]
  );
  if (check.rowCount > 0) {
    throw new Error(
      "Kategori masih memiliki order. Hapus order terlebih dahulu."
    );
  }

  await pool.query("DELETE FROM categories WHERE id = $1 AND user_id = $2", [
    Number(id),
    Number(userId),
  ]);
  return true;
}

// -----------------------------------------------------------------------------
// Order functions
// -----------------------------------------------------------------------------

export async function getAllOrdersForUser(userId) {
  await initDb();
  const res = await pool.query(
    "SELECT id, user_id, client_name, task_name, category_id, category_name, price, is_done, is_paid, notes, created_at, assigned_date, deadline_date FROM orders WHERE user_id = $1",
    [Number(userId)]
  );
  const orders = res.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    client_name: row.client_name,
    task_name: row.task_name,
    categoryId: row.category_id,
    category_name: row.category_name,
    price: row.price !== null ? Number(row.price) : 0,
    is_done: row.is_done,
    is_paid: row.is_paid,
    notes: row.notes,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    assigned_date: row.assigned_date
      ? row.assigned_date.toISOString().slice(0, 10)
      : null,
    deadline_date: row.deadline_date
      ? row.deadline_date.toISOString().slice(0, 10)
      : null,
  }));

  return orders.sort((a, b) => {
    const aDate = a.assigned_date ? new Date(a.assigned_date).getTime() : 0;
    const bDate = b.assigned_date ? new Date(b.assigned_date).getTime() : 0;
    return bDate - aDate;
  });
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

function parseBool(filter) {
  if (filter === "true") return true;
  if (filter === "false") return false;
  return null;
}

function sortOrders(list, sortBy = "assigned_date", sortDir = "desc") {
  const dir = sortDir === "asc" ? 1 : -1;
  const key = sortBy || "assigned_date";
  return list.slice().sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (key === "price") {
      va = Number(va) || 0;
      vb = Number(vb) || 0;
    } else if (key === "assigned_date" || key === "deadline_date") {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
    } else if (typeof va === "string") {
      va = va.toLowerCase();
      vb = (vb ?? "").toLowerCase();
    }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

export async function filterOrders({
  userId,
  search,
  isDone,
  isPaid,
  categoryId,
  sortBy,
  sortDir,
}) {
  const all = await getAllOrdersForUser(Number(userId));
  let orders = all;
  if (search) orders = orders.filter((o) => matchesSearch(o, search));

  const done = parseBool(isDone);
  if (done !== null) orders = orders.filter((o) => Boolean(o.is_done) === done);

  const paid = parseBool(isPaid);
  if (paid !== null) orders = orders.filter((o) => Boolean(o.is_paid) === paid);

  if (categoryId) {
    const cid = Number(categoryId);
    orders = orders.filter((o) => o.categoryId === cid);
  }

  orders = sortOrders(orders, sortBy, sortDir);
  return orders;
}

export function computeStats(orders) {
  const totalPaid = orders.reduce(
    (sum, o) => sum + (o.is_paid ? Number(o.price) || 0 : 0),
    0
  );
  const totalUnpaid = orders.reduce(
    (sum, o) => sum + (!o.is_paid ? Number(o.price) || 0 : 0),
    0
  );
  return {
    totalIncome: totalPaid,
    totalPaid,
    totalUnpaid,
    totalOrders: orders.length,
  };
}

export async function findOrder(userId, id) {
  await initDb();
  const res = await pool.query(
    "SELECT id, user_id, client_name, task_name, category_id, category_name, price, is_done, is_paid, notes, created_at, assigned_date, deadline_date FROM orders WHERE id = $1 AND user_id = $2 LIMIT 1",
    [Number(id), Number(userId)]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    client_name: row.client_name,
    task_name: row.task_name,
    categoryId: row.category_id,
    category_name: row.category_name,
    price: row.price !== null ? Number(row.price) : 0,
    is_done: row.is_done,
    is_paid: row.is_paid,
    notes: row.notes,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    assigned_date: row.assigned_date
      ? row.assigned_date.toISOString().slice(0, 10)
      : null,
    deadline_date: row.deadline_date
      ? row.deadline_date.toISOString().slice(0, 10)
      : null,
  };
}

export async function createOrder(userId, payload) {
  await initDb();
  const uid = Number(userId);
  const categoryId = payload.categoryId ? Number(payload.categoryId) : null;

  let category_name = "";
  if (categoryId != null) {
    const catRes = await pool.query(
      "SELECT name FROM categories WHERE id = $1 AND user_id = $2 LIMIT 1",
      [categoryId, uid]
    );
    if (catRes.rows[0]) category_name = catRes.rows[0].name;
  }

  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);

  const res = await pool.query(
    "INSERT INTO orders (user_id, client_name, task_name, category_id, category_name, price, is_done, is_paid, notes, created_at, assigned_date, deadline_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, user_id, client_name, task_name, category_id, category_name, price, is_done, is_paid, notes, created_at, assigned_date, deadline_date",
    [
      uid,
      payload.client_name?.trim() || "",
      payload.task_name?.trim() || "",
      categoryId,
      category_name || "",
      Number(payload.price) || 0,
      Boolean(payload.is_done),
      Boolean(payload.is_paid),
      payload.notes || "",
      now.toISOString(),
      payload.assigned_date || isoDate,
      payload.deadline_date || null,
    ]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    client_name: row.client_name,
    task_name: row.task_name,
    categoryId: row.category_id,
    category_name: row.category_name,
    price: row.price !== null ? Number(row.price) : 0,
    is_done: row.is_done,
    is_paid: row.is_paid,
    notes: row.notes,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    assigned_date: row.assigned_date
      ? row.assigned_date.toISOString().slice(0, 10)
      : null,
    deadline_date: row.deadline_date
      ? row.deadline_date.toISOString().slice(0, 10)
      : null,
  };
}

export async function updateOrder(userId, id, patch) {
  await initDb();
  const existing = await findOrder(userId, id);
  if (!existing) return null;

  let categoryId = existing.categoryId;
  let category_name = existing.category_name;

  if (patch.categoryId !== undefined) {
    const cid = patch.categoryId ? Number(patch.categoryId) : null;
    categoryId = cid;
    if (cid != null) {
      const catRes = await pool.query(
        "SELECT name FROM categories WHERE id = $1 AND user_id = $2 LIMIT 1",
        [cid, Number(userId)]
      );
      category_name = catRes.rows[0] ? catRes.rows[0].name : "";
    } else {
      category_name = "";
    }
  }

  const updated = {
    client_name:
      patch.client_name !== undefined
        ? patch.client_name.trim()
        : existing.client_name,
    task_name:
      patch.task_name !== undefined
        ? patch.task_name.trim()
        : existing.task_name,
    categoryId,
    category_name,
    price:
      patch.price !== undefined ? Number(patch.price) || 0 : existing.price,
    is_done:
      patch.is_done !== undefined ? Boolean(patch.is_done) : existing.is_done,
    is_paid:
      patch.is_paid !== undefined ? Boolean(patch.is_paid) : existing.is_paid,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    assigned_date:
      patch.assigned_date !== undefined
        ? patch.assigned_date
        : existing.assigned_date,
    deadline_date:
      patch.deadline_date !== undefined
        ? patch.deadline_date
        : existing.deadline_date,
  };

  await pool.query(
    "UPDATE orders SET client_name = $1, task_name = $2, category_id = $3, category_name = $4, price = $5, is_done = $6, is_paid = $7, notes = $8, assigned_date = $9, deadline_date = $10 WHERE id = $11 AND user_id = $12",
    [
      updated.client_name,
      updated.task_name,
      updated.categoryId,
      updated.category_name,
      updated.price,
      updated.is_done,
      updated.is_paid,
      updated.notes,
      updated.assigned_date || null,
      updated.deadline_date || null,
      Number(id),
      Number(userId),
    ]
  );

  return { ...existing, ...updated };
}

export async function deleteOrder(userId, id) {
  await initDb();
  const res = await pool.query(
    "DELETE FROM orders WHERE id = $1 AND user_id = $2 RETURNING id",
    [Number(id), Number(userId)]
  );
  return res.rowCount > 0;
}

export function getPool() {
  return pool;
}
