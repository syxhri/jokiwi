import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Pool dibuat secara lazy agar tidak crash saat build time
// (env DB tidak tersedia saat next build, hanya saat runtime)
let _pool = null;

function getPool() {
  if (_pool) return _pool;

  const raw =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;

  if (!raw) {
    throw new Error(
      "Missing Postgres connection string env. Set one of: POSTGRES_PRISMA_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING, DATABASE_URL"
    );
  }

  const connectionString = raw.replace("sslmode=require", "sslmode=no-verify");

  _pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  return _pool;
}

// Alias untuk backward-compat dengan kode lama yang mungkin masih pakai pool langsung
const pool = new Proxy({}, {
  get(_, prop) {
    return (...args) => getPool()[prop](...args);
  }
});

let initPromise;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/1/O/I biar nggak nyaru

function randomCodeBody(length = 16) {
  let out = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARS.length);
    out += CODE_CHARS[idx];
  }
  return out;
}

async function generateUniqueCode(tableName, columnName, prefix, length = null) {
  const client = await pool.connect();
  if (length === null || length < 1) {
    length = 16 - prefix.length;
  }

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
    // --- users ---
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      user_code VARCHAR(32),
      name TEXT,
      password_hash TEXT NOT NULL,
      qris_payload TEXT,
      whatsapp_phone TEXT,
      role TEXT DEFAULT 'joki'
    )`);

    // Migrasi kolom lama yang mungkin belum ada
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'joki'`);

    // --- categories ---
    await pool.query(`CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      category_code VARCHAR(32),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      notes TEXT
    )`);

    // --- orders ---
    await pool.query(`CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_code VARCHAR(32),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_name TEXT,
      task_name TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      category_name TEXT,
      price NUMERIC,
      is_done BOOLEAN DEFAULT FALSE,
      is_paid BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_at TIMESTAMPTZ,
      assigned_date DATE,
      deadline_date DATE,
      status TEXT DEFAULT 'manual',
      customer_name TEXT,
      customer_phone TEXT,
      customer_push_token TEXT,
      estimated_hours NUMERIC,
      storage_path TEXT,
      original_filename TEXT,
      file_uploaded_at TIMESTAMPTZ,
      file_downloaded_at TIMESTAMPTZ,
      file_delete_at TIMESTAMPTZ,
      payment_reminder_count INTEGER DEFAULT 0,
      last_reminder_at TIMESTAMPTZ
    )`);

    // Migrasi kolom order lama yang belum ada
    const orderCols = [
      ["status", "TEXT DEFAULT 'manual'"],
      ["customer_name", "TEXT"],
      ["customer_phone", "TEXT"],
      ["customer_push_token", "TEXT"],
      ["estimated_hours", "NUMERIC"],
      ["storage_path", "TEXT"],
      ["original_filename", "TEXT"],
      ["file_uploaded_at", "TIMESTAMPTZ"],
      ["file_downloaded_at", "TIMESTAMPTZ"],
      ["file_delete_at", "TIMESTAMPTZ"],
      ["payment_reminder_count", "INTEGER DEFAULT 0"],
      ["last_reminder_at", "TIMESTAMPTZ"],
      ["external_link", "TEXT"],
    ];
    for (const [col, type] of orderCols) {
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }

    // --- notifications ---
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // --- push_subscriptions ---
    await pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_json TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id)
    )`);

    // Unique indexes
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

// ─────────────────────────────────────────────────────────────
// USER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    userCode: row.user_code || null,
    username: row.username,
    name: row.name,
    passwordHash: row.password_hash,
    qrisPayload: row.qris_payload,
    whatsappPhone: row.whatsapp_phone || null,
    role: row.role || "joki",
  };
}

const USER_COLS = "id, user_code, username, name, password_hash, qris_payload, whatsapp_phone, role";

export async function findUserByUsername(username) {
  await initDb();
  username = username && username.toLowerCase();
  const res = await pool.query(
    `SELECT ${USER_COLS} FROM users WHERE username = $1 LIMIT 1`,
    [username]
  );
  return mapUser(res.rows[0]);
}

export async function findUserById(id) {
  await initDb();
  const res = await pool.query(
    `SELECT ${USER_COLS} FROM users WHERE id = $1 LIMIT 1`,
    [Number(id)]
  );
  return mapUser(res.rows[0]);
}

export async function findUserByCode(userCode) {
  await initDb();
  const res = await pool.query(
    `SELECT ${USER_COLS} FROM users WHERE user_code = $1 LIMIT 1`,
    [userCode]
  );
  return mapUser(res.rows[0]);
}

export async function findUser(id) {
  await initDb();
  const parsedId = Number(id);
  const isNaN = Number.isNaN(parsedId);
  const isUserCode = isNaN && typeof id == "string" && id.startsWith("U");
  const queryId = isNaN ? (isUserCode ? "user_code" : "username") : "id";
  const queryValue = isNaN ? id : parsedId;
  const res = await pool.query(
    `SELECT ${USER_COLS} FROM users WHERE ${queryId} = $1 LIMIT 1`,
    [queryValue]
  );
  return mapUser(res.rows[0]);
}

export async function createUser({ username, password, name = "", whatsappPhone = "" }) {
  await initDb();
  username = username && username.toLowerCase();
  const existing = await findUserByUsername(username);
  if (existing) {
    throw new Error("Username already exists");
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const userCode = await generateUniqueCode("users", "user_code", "U");

  const res = await pool.query(
    `INSERT INTO users (user_code, username, name, password_hash, whatsapp_phone, role)
     VALUES ($1, $2, $3, $4, $5, 'joki')
     RETURNING ${USER_COLS}`,
    [userCode, username, name, passwordHash, whatsappPhone || null]
  );
  return mapUser(res.rows[0]);
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
    `UPDATE users SET qris_payload = $1 WHERE id = $2 RETURNING ${USER_COLS}`,
    [qrisPayload ? String(qrisPayload).trim() : null, Number(userId)]
  );
  const row = res.rows[0];
  if (!row) throw new Error("User not found");
  return mapUser(row);
}

export async function deleteUserQris(userId) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    `UPDATE users SET qris_payload = NULL WHERE id = $1 RETURNING ${USER_COLS}`,
    [Number(userId)]
  );
  const row = res.rows[0];
  if (!row) throw new Error("User not found");
  return mapUser(row);
}

export async function setUserWhatsapp(userId, whatsappPhone) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const phone = whatsappPhone ? String(whatsappPhone).trim() : null;
  const res = await pool.query(
    `UPDATE users SET whatsapp_phone = $1 WHERE id = $2 RETURNING ${USER_COLS}`,
    [phone, Number(userId)]
  );
  const row = res.rows[0];
  if (!row) throw new Error("User not found");
  return mapUser(row);
}

/** Ambil semua penjoki aktif (role = 'joki') — untuk ditampilkan ke customer */
export async function getAllJoki() {
  await initDb();
  const res = await pool.query(
    `SELECT id, user_code, username, name, whatsapp_phone
     FROM users
     WHERE role = 'joki'
     ORDER BY name ASC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    userCode: row.user_code,
    username: row.username,
    name: row.name,
    hasWhatsapp: Boolean(row.whatsapp_phone),
  }));
}

// ─────────────────────────────────────────────────────────────
// CATEGORY FUNCTIONS
// ─────────────────────────────────────────────────────────────

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
    name: patch.name !== undefined && patch.name !== null ? String(patch.name).trim() : current.name,
    description:
      patch.description !== undefined && patch.description !== null ? String(patch.description).trim() : current.description,
    notes: patch.notes !== undefined && patch.notes !== null ? String(patch.notes).trim() : current.notes,
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

// ─────────────────────────────────────────────────────────────
// ORDER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderCode: row.order_code || null,
    userId: row.user_id,
    client_name: row.client_name,
    task_name: row.task_name,
    categoryId: row.category_id,
    categoryCode: row.category_code || null,
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
    // New fields
    status: row.status || "manual",
    customer_name: row.customer_name || null,
    customer_phone: row.customer_phone || null,
    customer_push_token: row.customer_push_token || null,
    estimated_hours: row.estimated_hours !== null ? Number(row.estimated_hours) : null,
    storage_path: row.storage_path || null,
    original_filename: row.original_filename || null,
    file_uploaded_at: row.file_uploaded_at ? new Date(row.file_uploaded_at).toISOString() : null,
    file_downloaded_at: row.file_downloaded_at ? new Date(row.file_downloaded_at).toISOString() : null,
    file_delete_at: row.file_delete_at ? new Date(row.file_delete_at).toISOString() : null,
    payment_reminder_count: row.payment_reminder_count || 0,
    last_reminder_at: row.last_reminder_at ? new Date(row.last_reminder_at).toISOString() : null,
    external_link: row.external_link || null,
  };
}

const ORDER_SELECT = `
  o.id,
  o.order_code,
  o.user_id,
  o.client_name,
  o.task_name,
  o.category_id,
  o.category_name,
  c.category_code,
  o.price,
  o.is_done,
  o.is_paid,
  o.notes,
  o.created_at,
  o.assigned_date,
  o.deadline_date,
  o.status,
  o.customer_name,
  o.customer_phone,
  o.customer_push_token,
  o.estimated_hours,
  o.storage_path,
  o.original_filename,
  o.file_uploaded_at,
  o.file_downloaded_at,
  o.file_delete_at,
  o.payment_reminder_count,
  o.last_reminder_at,
  o.external_link
`;

export async function getAllOrdersForUser(userId) {
  await initDb();
  userId = (await findUser(userId))?.id;

  const res = await pool.query(
    `SELECT ${ORDER_SELECT}
     FROM orders o
     LEFT JOIN categories c ON c.id = o.category_id
     WHERE o.user_id = $1`,
    [Number(userId)]
  );

  const orders = res.rows.map(mapOrder);

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
    order.customer_name?.toLowerCase().includes(q) ||
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
  status,
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
    orders = orders.filter((o) => o.categoryCode === categoryCode);
  }

  if (status) {
    orders = orders.filter((o) => o.status === status);
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
    `SELECT ${ORDER_SELECT}
    FROM orders o
    LEFT JOIN categories c ON c.id = o.category_id
    WHERE o.${isNaN ? "order_code" : "id"} = $1
    AND o.user_id = $2
    LIMIT 1`,
    [isNaN ? id : parsedId, Number(userId)]
  );
  return mapOrder(res.rows[0]);
}

/** Cari order hanya berdasarkan order_code — untuk customer tracking (tanpa user_id) */
export async function findOrderByCode(orderCode) {
  await initDb();
  const res = await pool.query(
    `SELECT ${ORDER_SELECT},
      u.whatsapp_phone AS joki_whatsapp,
      u.name AS joki_name,
      u.username AS joki_username,
      u.qris_payload AS joki_qris_payload
     FROM orders o
     LEFT JOIN categories c ON c.id = o.category_id
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.order_code = $1
     LIMIT 1`,
    [orderCode]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...mapOrder(row),
    jokiWhatsapp: row.joki_whatsapp || null,
    jokiName: row.joki_name || null,
    jokiUsername: row.joki_username || null,
    jokiQrisPayload: row.joki_qris_payload || null,
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
    `INSERT INTO orders (
      order_code, user_id, client_name, task_name, category_id, category_name,
      price, is_done, is_paid, notes, created_at, assigned_date, deadline_date,
      status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING id, order_code, user_id, client_name, task_name, category_id,
      category_name, price, is_done, is_paid, notes, created_at,
      assigned_date, deadline_date, status`,
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
      "manual", // order dibuat manual oleh penjoki
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
    status: row.status || "manual",
  };
}

/** Buat order dari customer (tanpa akun, hanya nama + WA + kategori/custom) */
export async function createCustomerOrder(jokiUserId, payload) {
  await initDb();
  jokiUserId = (await findUser(jokiUserId))?.id;
  if (!jokiUserId) throw new Error("Penjoki tidak ditemukan");

  const uid = Number(jokiUserId);
  let categoryId = payload.categoryId ? Number(payload.categoryId) : null;
  let category_name = "";

  if (categoryId != null) {
    const catRes = await pool.query(
      "SELECT name FROM categories WHERE id = $1 AND user_id = $2 LIMIT 1",
      [categoryId, uid]
    );
    if (catRes.rows[0]) category_name = catRes.rows[0].name;
  } else if (payload.customCategory && payload.customCategory.trim()) {
    const customName = payload.customCategory.trim();
    // Cek apakah kategori dengan nama tersebut sudah ada untuk penjoki ini
    const existingCat = await pool.query(
      "SELECT id, name FROM categories WHERE LOWER(name) = LOWER($1) AND user_id = $2 LIMIT 1",
      [customName, uid]
    );
    if (existingCat.rows[0]) {
      categoryId = existingCat.rows[0].id;
      category_name = existingCat.rows[0].name;
    } else {
      // Buat kategori baru secara otomatis agar tersimpan untuk penjoki
      const newCatCode = await generateUniqueCode("categories", "category_code", "CT");
      const newCatRes = await pool.query(
        "INSERT INTO categories (category_code, user_id, name, description) VALUES ($1, $2, $3, 'Dibuat otomatis oleh customer') RETURNING id, name",
        [newCatCode, uid, customName]
      );
      if (newCatRes.rows[0]) {
        categoryId = newCatRes.rows[0].id;
        category_name = newCatRes.rows[0].name;
      }
    }
  }

  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const orderCode = await generateUniqueCode("orders", "order_code", "OD");

  const res = await pool.query(
    `INSERT INTO orders (
      order_code, user_id, client_name, task_name, category_id, category_name,
      price, is_done, is_paid, notes, created_at, assigned_date, deadline_date,
      status, customer_name, customer_phone
    ) VALUES ($1,$2,$3,$4,$5,$6,0,false,false,$7,$8,$9,$10,'pending',$11,$12)
    RETURNING *`,
    [
      orderCode,
      uid,
      payload.customer_name?.trim() || "",
      payload.task_name?.trim() || "",
      categoryId,
      category_name || "",
      payload.notes || "",
      now.toISOString(),
      payload.assigned_date || isoDate,
      payload.deadline_date || null,
      payload.customer_name?.trim() || "",
      payload.customer_phone?.trim() || null,
    ]
  );

  return mapOrder(res.rows[0]);
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
      patch.client_name !== undefined && patch.client_name !== null
        ? patch.client_name.trim()
        : existing.client_name,
    task_name:
      patch.task_name !== undefined && patch.task_name !== null
        ? patch.task_name.trim()
        : existing.task_name,
    categoryId,
    category_name,
    price:
      patch.price !== undefined && patch.price !== null ? Number(patch.price) || 0 : existing.price,
    is_done:
      patch.is_done !== undefined && patch.is_done !== null ? Boolean(patch.is_done) : existing.is_done,
    is_paid:
      patch.is_paid !== undefined && patch.is_paid !== null ? Boolean(patch.is_paid) : existing.is_paid,
    notes: patch.notes !== undefined && patch.notes !== null && (patch.notes || "").trim() !== "" ? patch.notes : existing.notes,
    assigned_date:
      patch.assigned_date !== undefined && patch.assigned_date !== null
        ? patch.assigned_date
        : existing.assigned_date,
    deadline_date:
      patch.deadline_date !== undefined && patch.deadline_date !== null
        ? patch.deadline_date
        : existing.deadline_date,
  };

  await pool.query(
    `UPDATE orders SET
      client_name=$1, task_name=$2, category_id=$3, category_name=$4,
      price=$5, is_done=$6, is_paid=$7, notes=$8,
      assigned_date=$9, deadline_date=$10
     WHERE id=$11 AND user_id=$12`,
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

/** Terima order oleh penjoki — set status accepted, price, estimated_hours */
export async function acceptOrder(userId, orderId, { price, estimatedHours }) {
  await initDb();
  const existing = await findOrder(userId, orderId);
  if (!existing) return null;

  const res = await pool.query(
    `UPDATE orders SET
      status = 'accepted',
      price = $1,
      estimated_hours = $2,
      is_done = false
     WHERE id = $3 AND user_id = $4 AND status = 'pending'
     RETURNING *`,
    [Number(price) || 0, Number(estimatedHours) || null, Number(existing.id), Number(existing.userId)]
  );
  if (res.rowCount === 0) return null;
  return mapOrder(res.rows[0]);
}

/** Tolak order oleh penjoki */
export async function rejectOrder(userId, orderId) {
  await initDb();
  const existing = await findOrder(userId, orderId);
  if (!existing) return null;

  const res = await pool.query(
    `UPDATE orders SET status = 'rejected'
     WHERE id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING *`,
    [Number(existing.id), Number(existing.userId)]
  );
  if (res.rowCount === 0) return null;
  return mapOrder(res.rows[0]);
}

/** Set file hasil kerja setelah upload */
export async function setOrderFile(userId, orderId, { storagePath, originalFilename }) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const now = new Date();
  const res = await pool.query(
    `UPDATE orders SET
      storage_path = $1,
      original_filename = $2,
      file_uploaded_at = $3,
      file_downloaded_at = NULL,
      file_delete_at = NULL,
      status = 'done',
      is_done = true
     WHERE id = $4 AND user_id = $5
     RETURNING *`,
    [storagePath, originalFilename, now.toISOString(), Number(orderId), Number(userId)]
  );
  if (res.rowCount === 0) return null;
  return mapOrder(res.rows[0]);
}

/** Set link external (misal Google Drive / Mega untuk file > 50MB) */
export async function setOrderExternalLink(userId, orderId, externalLink) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const now = new Date();
  const res = await pool.query(
    `UPDATE orders SET
      external_link = $1,
      file_uploaded_at = $2,
      status = 'done',
      is_done = true
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [externalLink, now.toISOString(), Number(orderId), Number(userId)]
  );
  if (res.rowCount === 0) return null;
  return mapOrder(res.rows[0]);
}

/** Catat pengiriman reminder bayar (manual atau cron) */
export async function recordReminderSent(orderId) {
  await initDb();
  const now = new Date();
  await pool.query(
    `UPDATE orders SET
      payment_reminder_count = COALESCE(payment_reminder_count, 0) + 1,
      last_reminder_at = $1
     WHERE id = $2`,
    [now.toISOString(), Number(orderId)]
  );
}

/** Hapus data file dari DB (setelah file dihapus dari storage) */
export async function clearOrderFile(orderId) {
  await initDb();
  await pool.query(
    `UPDATE orders SET
      storage_path = NULL,
      original_filename = NULL,
      file_uploaded_at = NULL,
      file_downloaded_at = NULL,
      file_delete_at = NULL
     WHERE id = $1`,
    [Number(orderId)]
  );
}

/** Tandai file sudah didownload — set jadwal hapus 15 menit dari sekarang */
export async function markFileDownloaded(orderId) {
  await initDb();
  const now = new Date();
  const deleteAt = new Date(now.getTime() + 15 * 60 * 1000); // +15 menit
  await pool.query(
    `UPDATE orders SET
      file_downloaded_at = $1,
      file_delete_at = $2
     WHERE id = $3 AND file_downloaded_at IS NULL`,
    [now.toISOString(), deleteAt.toISOString(), Number(orderId)]
  );
}

/** Konfirmasi pembayaran manual oleh penjoki */
export async function confirmPayment(userId, orderId) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    `UPDATE orders SET is_paid = true
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [Number(orderId), Number(userId)]
  );
  if (res.rowCount === 0) return null;
  return mapOrder(res.rows[0]);
}

/** Simpan push token customer ke order */
export async function setOrderCustomerPushToken(orderCode, pushTokenJson) {
  await initDb();
  await pool.query(
    `UPDATE orders SET customer_push_token = $1 WHERE order_code = $2`,
    [pushTokenJson, orderCode]
  );
}

/** Ambil semua order yang perlu reminder pembayaran:
 *  - status = 'done', is_paid = false, storage_path NOT NULL
 *  - last_reminder_at IS NULL atau sudah lebih dari 30 menit lalu
 */
export async function getOrdersPendingPaymentReminder() {
  await initDb();
  const res = await pool.query(
    `SELECT ${ORDER_SELECT},
      u.whatsapp_phone AS joki_whatsapp,
      u.name AS joki_name
     FROM orders o
     LEFT JOIN categories c ON c.id = o.category_id
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.status = 'done'
       AND o.is_paid = false
       AND o.storage_path IS NOT NULL
       AND (
         o.last_reminder_at IS NULL
         OR o.last_reminder_at < NOW() - INTERVAL '30 minutes'
       )`
  );
  return res.rows.map((row) => ({
    ...mapOrder(row),
    jokiWhatsapp: row.joki_whatsapp || null,
    jokiName: row.joki_name || null,
  }));
}

/** Update last_reminder_at dan increment payment_reminder_count */
export async function updateReminderSent(orderId) {
  await initDb();
  await pool.query(
    `UPDATE orders SET
      last_reminder_at = NOW(),
      payment_reminder_count = COALESCE(payment_reminder_count, 0) + 1
     WHERE id = $1`,
    [Number(orderId)]
  );
}

/** Ambil semua order yang file-nya sudah waktunya dihapus */
export async function getOrdersPendingFileCleanup() {
  await initDb();
  const res = await pool.query(
    `SELECT id, order_code, storage_path, original_filename
     FROM orders
     WHERE file_delete_at IS NOT NULL
       AND file_delete_at < NOW()
       AND storage_path IS NOT NULL`
  );
  return res.rows.map((row) => ({
    id: row.id,
    orderCode: row.order_code,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
  }));
}

export async function deleteOrder(userId, id) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const order = await findOrder(userId, id);
  if (!order) return false;

  const res = await pool.query(
    "DELETE FROM orders WHERE id = $1 AND user_id = $2 RETURNING id",
    [Number(order.id), Number(userId)]
  );
  return res.rowCount > 0;
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATION FUNCTIONS
// ─────────────────────────────────────────────────────────────

export async function createNotification(userId, orderId, type, message) {
  await initDb();
  const res = await pool.query(
    `INSERT INTO notifications (user_id, order_id, type, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId ? Number(userId) : null, Number(orderId), type, message]
  );
  return res.rows[0];
}

export async function getNotificationsForUser(userId, limit = 30) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    `SELECT n.id, n.order_id, o.order_code, n.type, n.message, n.is_read, n.created_at
     FROM notifications n
     LEFT JOIN orders o ON o.id = n.order_id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [Number(userId), limit]
  );
  return res.rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    orderCode: row.order_code,
    type: row.type,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  }));
}

export async function markAllNotificationsRead(userId) {
  await initDb();
  userId = (await findUser(userId))?.id;
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [Number(userId)]
  );
}

export async function countUnreadNotifications(userId) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = $1 AND is_read = false`,
    [Number(userId)]
  );
  return Number(res.rows[0]?.cnt || 0);
}

// ─────────────────────────────────────────────────────────────
// PUSH SUBSCRIPTION FUNCTIONS
// ─────────────────────────────────────────────────────────────

export async function savePushSubscription(userId, subscriptionJson) {
  await initDb();
  userId = (await findUser(userId))?.id;
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, subscription_json)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET subscription_json = EXCLUDED.subscription_json, created_at = NOW()`,
    [Number(userId), subscriptionJson]
  );
}

export async function getPushSubscription(userId) {
  await initDb();
  userId = (await findUser(userId))?.id;
  const res = await pool.query(
    `SELECT subscription_json FROM push_subscriptions WHERE user_id = $1 LIMIT 1`,
    [Number(userId)]
  );
  return res.rows[0]?.subscription_json || null;
}

// ─────────────────────────────────────────────────────────────
// MISC
// ─────────────────────────────────────────────────────────────

export { getPool };