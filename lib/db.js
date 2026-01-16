import { Pool } from "pg";
import bcrypt from "bcryptjs";

const raw =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL;

const connectionString = raw?.replace("sslmode=require", "sslmode=no-verify");

if (!connectionString) {
  throw new Error("Missing Postgres connection string env");
}

console.log("[DB] using pooler url?", {
  hasPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
  hasPostgresUrl: !!process.env.POSTGRES_URL,
  hasNonPooling: !!process.env.POSTGRES_URL_NON_POOLING,
  nodeEnv: process.env.NODE_ENV,
  vercel: process.env.VERCEL,
});

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

let initPromise;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/1/O/I biar nggak nyaru

function randomCodeBody(length = 4) {
  let out = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARS.length);
    out += CODE_CHARS[idx];
  }
  return out;
}

async function generateUniqueCode(tableName, columnName, prefix, length = 4) {
  const client = await pool.connect();
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = prefix + randomCodeBody(length);

      const res = await client.query(
        `SELECT 1 FROM ${tableName} WHERE ${columnName} = $1 LIMIT 1`,
        [candidate]
      );

      if (res.rows.length === 0) {
        return candidate;
      }
    }
    throw new Error("Gagal menghasilkan kode unik setelah beberapa percobaan.");
  } finally {
    client.release();
  }
}

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

    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS user_code VARCHAR(16)"
    );
    await pool.query(
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_code VARCHAR(16)"
    );
    await pool.query(
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code VARCHAR(16)"
    );

    await pool.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_user_code_key ON users(user_code)"
    );
    await pool.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS categories_category_code_key ON categories(category_code)"
    );
    await pool.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS orders_order_code_key ON orders(order_code)"
    );
  })();
  return initPromise;
}

export async function findUserByUsername(username) {
  await initDb();
  username = username && username.toLowerCase();
  const res = await pool.query(
    "SELECT id, user_code, username, name, password_hash, qris_payload FROM users WHERE username = $1 LIMIT 1",
    [username]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userCode: row.user_code || null,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

export async function findUserById(id) {
  await initDb();
  const res = await pool.query(
    "SELECT id, user_code, username, name, password_hash, qris_payload FROM users WHERE id = $1 LIMIT 1",
    [Number(id)]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userCode: row.user_code || null,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

export async function findUserByCode(userCode) {
  await initDb();
  const res = await pool.query(
    "SELECT id, user_code, username, name, password_hash, qris_payload FROM users WHERE user_code = $1 LIMIT 1",
    [userCode]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userCode: row.user_code || null,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

export async function findUser(id) {
  await initDb();
  const parsedId = Number(id);
  const isNaN = Number.isNaN(parsedId);
  const isUserCode = isNaN && typeof id == "string" && id.startsWith("U");
  const queryId = isNaN ? (isUserCode ? "user_code" : "username") : "id";
  const queryValue = isNaN ? id : parsedId;
  const res = await pool.query(
    `SELECT id, user_code, username, name, password_hash, qris_payload FROM users WHERE ${queryId} = $1 LIMIT 1`,
    [queryValue]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userCode: row.user_code || null,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

export async function createUser({ username, password, name = "" }) {
  await initDb();
  username = username && username.toLowerCase();
  const existing = await findUserByUsername(username);
  if (existing) {
    throw new Error("Username already exists");
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const userCode = await generateUniqueCode("users", "user_code", "U");

  const res = await pool.query(
    "INSERT INTO users (user_code, username, name, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, user_code, username, name, password_hash, qris_payload",
    [userCode, username, name, passwordHash]
  );
  const row = res.rows[0];
  return {
    id: row.id,
    userCode: row.user_code || null,
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
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    "UPDATE users SET qris_payload = $1 WHERE id = $2 RETURNING id, user_code, username, name, password_hash, qris_payload",
    [qrisPayload ? String(qrisPayload).trim() : null, Number(userId)]
  );
  const row = res.rows[0];
  if (!row) throw new Error("User not found");
  return {
    id: row.id,
    userCode: row.user_code || null,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

export async function deleteUserQris(userId) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    "UPDATE users SET qris_payload = NULL WHERE id = $1 RETURNING id, user_code, username, name, password_hash, qris_payload",
    [Number(userId)]
  );
  const row = res.rows[0];
  if (!row) throw new Error("User not found");
  return {
    id: row.id,
    userCode: row.user_code || null,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
  };
}

export async function getAllCategoriesForUser(userId) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    "SELECT id, user_id, category_code, name, description, notes FROM categories WHERE user_id = $1 ORDER BY name ASC",
    [Number(userId)]
  );
  return res.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    categoryCode: row.category_code || null,
    name: row.name,
    description: row.description,
    notes: row.notes,
  }));
}

export async function findCategory(userId, id) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const parsedId = Number(id);
  const isNaN = Number.isNaN(parsedId);
  const res = await pool.query(
    `SELECT id, user_id, category_code, name, description, notes FROM categories WHERE ${isNaN ? "category_code" : "id"} = $1 AND user_id = $2 LIMIT 1`,
    [isNaN ? id : parsedId, Number(userId)]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    categoryCode: row.category_code || null,
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
  userId = (await findUser(userId))?.id;
  const trimmedName = name.trim();
  const categoryCode = await generateUniqueCode(
    "categories",
    "category_code",
    "CT"
  );

  const res = await pool.query(
    "INSERT INTO categories (category_code, user_id, name, description, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, category_code, name, description, notes",
    [categoryCode, Number(userId), trimmedName, description, notes]
  );
  const row = res.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    categoryCode: row.category_code || null,
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
      Number(current.id),
      Number(current.userId),
    ]
  );
  if (patch.name !== undefined) {
    await pool.query(
      "UPDATE orders SET category_name = $1 WHERE category_id = $2 AND user_id = $3",
      [updated.name, Number(current.id), Number(current.userId)]
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
    [Number(cat.userId), Number(cat.id)]
  );
  if (check.rowCount > 0) {
    throw new Error(
      "Kategori masih memiliki order. Hapus order terlebih dahulu."
    );
  }

  await pool.query("DELETE FROM categories WHERE id = $1 AND user_id = $2", [
    Number(cat.id),
    Number(cat.userId),
  ]);
  return true;
}

export async function getAllOrdersForUser(userId) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    "SELECT id, user_id, order_code, client_name, task_name, category_id, category_name, price, is_done, is_paid, notes, created_at, assigned_date, deadline_date FROM orders WHERE user_id = $1",
    [Number(userId)]
  );
  const orders = res.rows.map((row) => ({
    id: row.id,
    orderCode: row.order_code || null,
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
  categoryCode,
  sortBy,
  sortDir,
}) {
  const all = await getAllOrdersForUser(userId);
  let orders = all;
  if (search) orders = orders.filter((o) => matchesSearch(o, search));

  const done = parseBool(isDone);
  if (done !== null) orders = orders.filter((o) => Boolean(o.is_done) === done);

  const paid = parseBool(isPaid);
  if (paid !== null) orders = orders.filter((o) => Boolean(o.is_paid) === paid);

  if (categoryCode) {
    const cid = categoryCode;
    orders = orders.filter((o) => o.categoryCode === cid);
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
  userId = (await findUser(userId))?.id;
  const parsedId = Number(id);
  const isNaN = Number.isNaN(parsedId);
  const res = await pool.query(
    `SELECT id, user_id, order_code, client_name, task_name, category_id, category_name, price, is_done, is_paid, notes, created_at, assigned_date, deadline_date FROM orders WHERE ${isNaN ? "order_code" : "id"} = $1 AND user_id = $2 LIMIT 1`,
    [isNaN ? id : parsedId, Number(userId)]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    orderCode: row.order_code || null,
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
  userId = (await findUser(userId))?.id;
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

  const orderCode = await generateUniqueCode("orders", "order_code", "OD");

  const res = await pool.query(
    "INSERT INTO orders (order_code, user_id, client_name, task_name, category_id, category_name, price, is_done, is_paid, notes, created_at, assigned_date, deadline_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, order_code, user_id, client_name, task_name, category_id, category_name, price, is_done, is_paid, notes, created_at, assigned_date, deadline_date",
    [
      orderCode,
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
    orderCode: row.order_code || null,
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
        [cid, Number(existing.userId)]
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
      Number(existing.id),
      Number(existing.userId),
    ]
  );

  return { ...existing, ...updated };
}

export async function deleteOrder(userId, id) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    "DELETE FROM orders WHERE id = $1 AND user_id = $2 RETURNING id",
    [Number(id), Number(userId)]
  );
  return res.rowCount > 0;
}

export function getPool() {
  return pool;
}