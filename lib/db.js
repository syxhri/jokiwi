// lib/db.js

/**
 * Database layer for the Jokiwi application.
 *
 * This module wraps a lowdb JSON-based database and exposes
 * typed functions for managing users, categories and orders.
 * Each record belongs to a specific user (identified by userId),
 * allowing multi-user isolation. An in-memory cache of the database
 * connection is maintained via the `dbPromise` variable. When first
 * invoked, the database is initialised with sensible defaults.
 */

import { JSONFilePreset } from 'lowdb/node';

// Default shape of the database. When db.json does not exist,
// lowdb will create it using this structure. Collections for
// users, categories and orders reside alongside a meta section
// for tracking next IDs. A new collection can be introduced
// simply by adding a property here.
const defaultData = {
  users: [],
  categories: [],
  orders: [],
  meta: {
    nextUserId: 1,
    nextCategoryId: 1,
    nextOrderId: 1,
  },
};

// Cached promise of the database connection. Because lowdb
// internally caches the underlying file handler, subsequent calls
// to JSONFilePreset will return the same instance. We still
// expose a getter for clarity and to perform on-demand
// initialisation when first accessed.
let dbPromise;

/**
 * Retrieve the lowdb instance, initialising it if necessary. When
 * the database is created for the first time, this function also
 * ensures that all collections and meta keys exist. Without this
 * safeguard, adding new collections in future versions could lead
 * to undefined properties. After any structural fix-ups, the
 * database is written back to disk.
 */
export async function getDb() {
  if (!dbPromise) {
    dbPromise = JSONFilePreset('db.json', defaultData);
  }
  const db = await dbPromise;
  // ensure all top-level properties exist
  db.data.users ??= [];
  db.data.categories ??= [];
  db.data.orders ??= [];
  db.data.meta ??= {};
  db.data.meta.nextUserId ??= 1;
  db.data.meta.nextCategoryId ??= 1;
  db.data.meta.nextOrderId ??= 1;
  await db.write();
  return db;
}

/**
 * Increment and return the next ID for a given entity type. IDs
 * are allocated sequentially per entity type. The `kind` should
 * be one of `user`, `category` or `order`. Throws if an unknown
 * kind is provided.
 *
 * @param {('user'|'category'|'order')} kind
 * @returns {Promise<number>} the next numeric ID
 */
async function getNextId(kind) {
  const db = await getDb();
  const key =
    kind === 'user'
      ? 'nextUserId'
      : kind === 'category'
      ? 'nextCategoryId'
      : kind === 'order'
      ? 'nextOrderId'
      : null;
  if (!key) throw new Error(`Unknown id kind: ${kind}`);
  const current = db.data.meta[key] ?? 1;
  db.data.meta[key] = current + 1;
  await db.write();
  return current;
}

// -----------------------------------------------------------------------------
// User functions
// -----------------------------------------------------------------------------

/**
 * Find a user by their username. Returns null if not found.
 *
 * @param {string} username
 * @returns {Promise<object|null>}
 */
export async function findUserByUsername(username) {
  const db = await getDb();
  await db.read();
  return db.data.users.find(u => u.username === username) ?? null;
}

/**
 * Find a user by their numeric ID. Returns null if not found.
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function findUserById(id) {
  const db = await getDb();
  await db.read();
  return db.data.users.find(u => u.id === id) ?? null;
}

/**
 * Create a new user. The username must be unique across all users.
 * Passwords are stored in plain text for simplicity; in a real
 * application you should hash passwords before saving. Returns the
 * created user.
 *
 * @param {object} payload
 * @param {string} payload.username
 * @param {string} payload.password
 * @param {string} [payload.name]
 * @returns {Promise<object>}
 */
export async function createUser({ username, password, name = '' }) {
  const db = await getDb();
  await db.read();
  if (db.data.users.some(u => u.username === username)) {
    throw new Error('Username already exists');
  }
  const id = await getNextId('user');
  const user = { id, username, password, name };
  db.data.users.push(user);
  await db.write();
  return user;
}

// -----------------------------------------------------------------------------
// Category functions
// -----------------------------------------------------------------------------

/**
 * Retrieve all categories for a given user. Categories are sorted
 * alphabetically by name.
 *
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function getAllCategoriesForUser(userId) {
  const db = await getDb();
  await db.read();
  return db.data.categories
    .filter(cat => cat.userId === userId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Find a category by ID for a particular user. Returns null if not found
 * or if it belongs to another user.
 *
 * @param {number} userId
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function findCategory(userId, id) {
  const db = await getDb();
  await db.read();
  const cat = db.data.categories.find(c => c.id === id);
  if (!cat || cat.userId !== userId) return null;
  return cat;
}

/**
 * Create a new category for a user. Returns the created category.
 *
 * @param {number} userId
 * @param {object} payload
 * @param {string} payload.name
 * @param {string} [payload.description]
 * @param {string} [payload.notes]
 * @returns {Promise<object>}
 */
export async function createCategory(userId, { name, description = '', notes = '' }) {
  const db = await getDb();
  await db.read();
  const id = await getNextId('category');
  const category = {
    id,
    userId,
    name: name.trim(),
    description,
    notes,
  };
  db.data.categories.push(category);
  await db.write();
  return category;
}

/**
 * Update an existing category. Only mutable fields can be changed. If
 * the category does not belong to the specified user, null is returned.
 *
 * @param {number} userId
 * @param {number} id
 * @param {object} patch
 * @returns {Promise<object|null>}
 */
export async function updateCategory(userId, id, patch) {
  const db = await getDb();
  await db.read();
  const idx = db.data.categories.findIndex(c => c.id === id);
  if (idx === -1) return null;
  const category = db.data.categories[idx];
  if (category.userId !== userId) return null;
  const updated = {
    ...category,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() : category.name,
  };
  db.data.categories[idx] = updated;
  // If the name changed, update category_name on related orders
  if (patch.name !== undefined) {
    db.data.orders = db.data.orders.map(o =>
      o.categoryId === id && o.userId === userId ? { ...o, category_name: updated.name } : o,
    );
  }
  await db.write();
  return updated;
}

/**
 * Delete a category. Throws an error if the category contains orders.
 * Returns true on success, false if the category doesn't exist or
 * belongs to another user.
 *
 * @param {number} userId
 * @param {number} id
 * @returns {Promise<boolean>}
 */
export async function deleteCategory(userId, id) {
  const db = await getDb();
  await db.read();
  const idx = db.data.categories.findIndex(c => c.id === id);
  if (idx === -1) return false;
  const category = db.data.categories[idx];
  if (category.userId !== userId) return false;
  // Ensure no orders reference this category
  const hasOrders = db.data.orders.some(o => o.userId === userId && o.categoryId === id);
  if (hasOrders) {
    throw new Error('Kategori masih memiliki order. Hapus order terlebih dahulu.');
  }
  db.data.categories.splice(idx, 1);
  await db.write();
  return true;
}

// -----------------------------------------------------------------------------
// Order functions
// -----------------------------------------------------------------------------

/**
 * Retrieve all orders for a specific user. Orders are sorted by
 * assigned_date descending by default.
 *
 * @param {number} userId
 * @returns {Promise<Array>}
 */
export async function getAllOrdersForUser(userId) {
  const db = await getDb();
  await db.read();
  return db.data.orders
    .filter(o => o.userId === userId)
    .sort((a, b) => {
      const aDate = a.assigned_date ? new Date(a.assigned_date).getTime() : 0;
      const bDate = b.assigned_date ? new Date(b.assigned_date).getTime() : 0;
      return bDate - aDate;
    });
}

/**
 * Utility to match an order against a search term across several fields.
 */
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

/**
 * Helper to coerce a filter value string into a boolean or null. A value
 * of 'true' yields true, 'false' yields false, and anything else yields null.
 */
function parseBool(filter) {
  if (filter === 'true') return true;
  if (filter === 'false') return false;
  return null;
}

/**
 * Sort a list of orders by the specified property and direction. Unknown
 * sort keys default to assigned_date. Sorting on numbers, dates and
 * strings is supported.
 */
function sortOrders(list, sortBy = 'assigned_date', sortDir = 'desc') {
  const dir = sortDir === 'asc' ? 1 : -1;
  const key = sortBy || 'assigned_date';
  return list.slice().sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    // normalise values
    if (key === 'price') {
      va = Number(va) || 0;
      vb = Number(vb) || 0;
    } else if (key === 'assigned_date' || key === 'deadline_date') {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
    } else if (typeof va === 'string') {
      va = va.toLowerCase();
      vb = (vb ?? '').toLowerCase();
    }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

/**
 * Filter, sort and return orders for a user. The returned list includes
 * only orders belonging to the given user. Filtering is performed in
 * memory; this is acceptable given the expected small dataset size.
 *
 * @param {object} params
 * @param {number} params.userId
 * @param {string} [params.search]
 * @param {string} [params.isDone] 'true' | 'false' | undefined
 * @param {string} [params.isPaid] 'true' | 'false' | undefined
 * @param {string|number} [params.categoryId]
 * @param {string} [params.sortBy] one of 'assigned_date','deadline_date','price'
 * @param {string} [params.sortDir] 'asc' or 'desc'
 * @returns {Promise<Array>}
 */
export async function filterOrders({
  userId,
  search,
  isDone,
  isPaid,
  categoryId,
  sortBy,
  sortDir,
}) {
  const db = await getDb();
  await db.read();
  let orders = db.data.orders.filter(o => o.userId === userId);
  if (search) {
    orders = orders.filter(o => matchesSearch(o, search));
  }
  const done = parseBool(isDone);
  if (done !== null) {
    orders = orders.filter(o => Boolean(o.is_done) === done);
  }
  const paid = parseBool(isPaid);
  if (paid !== null) {
    orders = orders.filter(o => Boolean(o.is_paid) === paid);
  }
  if (categoryId) {
    const cid = Number(categoryId);
    orders = orders.filter(o => o.categoryId === cid);
  }
  orders = sortOrders(orders, sortBy, sortDir);
  return orders;
}

/**
 * Compute aggregate statistics from a list of orders. Total income is
 * defined as the sum of prices for orders that have been paid.
 * Total paid/unpaid break down the amounts by payment status.
 *
 * @param {Array} orders
 * @returns {object}
 */
export function computeStats(orders) {
  const totalPaid = orders.reduce((sum, o) => sum + (o.is_paid ? Number(o.price) || 0 : 0), 0);
  const totalUnpaid = orders.reduce((sum, o) => sum + (!o.is_paid ? Number(o.price) || 0 : 0), 0);
  return {
    totalIncome: totalPaid,
    totalPaid,
    totalUnpaid,
    totalOrders: orders.length,
  };
}

/**
 * Find a single order by ID belonging to a user. Returns null if not
 * found or belongs to another user.
 *
 * @param {number} userId
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function findOrder(userId, id) {
  const db = await getDb();
  await db.read();
  const order = db.data.orders.find(o => o.id === id);
  if (!order || order.userId !== userId) return null;
  return order;
}

/**
 * Create a new order for a user.
 *
 * @param {number} userId
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createOrder(userId, payload) {
  const db = await getDb();
  await db.read();
  const id = await getNextId('order');
  const categoryId = payload.categoryId ? Number(payload.categoryId) : null;
  let category_name = '';
  if (categoryId != null) {
    const category = db.data.categories.find(c => c.id === categoryId && c.userId === userId);
    if (category) {
      category_name = category.name;
    }
  }
  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const order = {
    id,
    userId,
    client_name: payload.client_name?.trim() || '',
    task_name: payload.task_name?.trim() || '',
    categoryId,
    category_name: category_name || '',
    price: Number(payload.price) || 0,
    is_done: Boolean(payload.is_done),
    is_paid: Boolean(payload.is_paid),
    notes: payload.notes || '',
    created_at: now.toISOString(),
    assigned_date: payload.assigned_date || isoDate,
    deadline_date: payload.deadline_date || '',
  };
  db.data.orders.push(order);
  await db.write();
  return order;
}

/**
 * Update an existing order for a user. Returns the updated order or
 * null if not found or belongs to another user.
 *
 * @param {number} userId
 * @param {number} id
 * @param {object} patch
 * @returns {Promise<object|null>}
 */
export async function updateOrder(userId, id, patch) {
  const db = await getDb();
  await db.read();
  const idx = db.data.orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  const prev = db.data.orders[idx];
  if (prev.userId !== userId) return null;
  let categoryId = prev.categoryId;
  let category_name = prev.category_name;
  if (patch.categoryId !== undefined) {
    const cid = patch.categoryId ? Number(patch.categoryId) : null;
    categoryId = cid;
    if (cid != null) {
      const category = db.data.categories.find(c => c.id === cid && c.userId === userId);
      category_name = category ? category.name : '';
    } else {
      category_name = '';
    }
  }
  const updated = {
    ...prev,
    ...patch,
    categoryId,
    category_name,
    price: patch.price !== undefined ? Number(patch.price) || 0 : prev.price,
    is_done: patch.is_done !== undefined ? Boolean(patch.is_done) : prev.is_done,
    is_paid: patch.is_paid !== undefined ? Boolean(patch.is_paid) : prev.is_paid,
  };
  db.data.orders[idx] = updated;
  await db.write();
  return updated;
}

/**
 * Delete an order belonging to a user. Returns true if an order was
 * deleted. Returns false if not found or belongs to another user.
 *
 * @param {number} userId
 * @param {number} id
 */
export async function deleteOrder(userId, id) {
  const db = await getDb();
  await db.read();
  const initial = db.data.orders.length;
  db.data.orders = db.data.orders.filter(o => !(o.id === id && o.userId === userId));
  const changed = db.data.orders.length < initial;
  if (changed) await db.write();
  return changed;
}