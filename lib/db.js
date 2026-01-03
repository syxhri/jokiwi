// lib/db.js

/**
 * Lightweight JSON-based database powered by lowdb.
 *
 * lowdb is a pure JavaScript key-value store that persists
 * data to a JSON file on disk. It's ideal for simple projects
 * running in constrained environments (e.g. Termux on Android)
 * because it has zero native dependencies and no compilation step
 * during installation【893850126605406†L5-L15】. Data is stored in
 * plain JavaScript objects and can be queried with native array
 * methods【893850126605406†L37-L49】. Because writes are atomic and
 * the package is ESM-only, we mark our `package.json` with
 * "type": "module" and use top-level async functions.
 */

import { JSONFilePreset } from 'lowdb/node';

// Define the default structure of our database. When the db.json
// file doesn't exist, lowdb will create it with this shape.
const defaultData = { orders: [] };

// Lazy-load the database. JSONFilePreset returns a promise that
// resolves to a database instance. Because lowdb caches the
// instance, subsequent calls return the same object.
let dbPromise;
async function getDb() {
  if (!dbPromise) {
    dbPromise = JSONFilePreset('db.json', defaultData);
  }
  return dbPromise;
}

/**
 * Retrieve all orders from the database.
 * @returns {Promise<Array>} list of orders
 */
export async function getAllOrders() {
  const db = await getDb();
  await db.read();
  return db.data.orders;
}

/**
 * Filter and sort orders according to the provided criteria.
 * Filtering is performed in-memory using native array methods.
 *
 * @param {Object} options filtering options
 * @param {string|null} options.search optional search term
 * @param {boolean|null} options.is_done filter by completion status
 * @param {boolean|null} options.is_paid filter by payment status
 */
export async function filterOrders({ search, is_done, is_paid }) {
  let orders = await getAllOrders();
  // Apply search filter on client_name or task_name
  if (search) {
    const term = search.toLowerCase();
    orders = orders.filter(
      o =>
        o.client_name.toLowerCase().includes(term) ||
        o.task_name.toLowerCase().includes(term),
    );
  }
  if (is_done !== null && is_done !== undefined) {
    orders = orders.filter(o => Boolean(o.is_done) === Boolean(is_done));
  }
  if (is_paid !== null && is_paid !== undefined) {
    orders = orders.filter(o => Boolean(o.is_paid) === Boolean(is_paid));
  }
  // Sort by created_at descending
  orders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return orders;
}

/**
 * Compute aggregate statistics from a list of orders.
 */
export function computeStats(orders) {
  return {
    totalIncome: orders.reduce((sum, order) => sum + order.price, 0),
    totalPaid: orders.filter(o => o.is_paid).reduce((sum, o) => sum + o.price, 0),
    totalUnpaid: orders.filter(o => !o.is_paid).reduce((sum, o) => sum + o.price, 0),
    totalOrders: orders.length,
    doneCount: orders.filter(o => o.is_done).length,
  };
}

/**
 * Find an order by its numeric ID.
 * @param {number} id order identifier
 */
export async function findOrder(id) {
  const db = await getDb();
  await db.read();
  return db.data.orders.find(o => o.id === id);
}

/**
 * Generate a new numeric ID based on existing orders.
 */
async function generateId() {
  const orders = await getAllOrders();
  const maxId = orders.reduce((max, o) => Math.max(max, o.id ?? 0), 0);
  return maxId + 1;
}

/**
 * Create a new order in the database.
 * @param {Object} data order fields
 */
export async function createOrder(data) {
  const db = await getDb();
  await db.read();
  const id = await generateId();
  const newOrder = {
    id,
    client_name: data.client_name,
    task_name: data.task_name,
    subject_or_category: data.subject_or_category || null,
    price: data.price,
    note: data.note || null,
    is_done: Boolean(data.is_done),
    is_paid: Boolean(data.is_paid),
    created_at: new Date().toISOString(),
  };
  db.data.orders.push(newOrder);
  await db.write();
  return newOrder;
}

/**
 * Update an existing order by ID. Returns the updated order or undefined if
 * the order does not exist.
 */
export async function updateOrder(id, update) {
  const db = await getDb();
  await db.read();
  const idx = db.data.orders.findIndex(o => o.id === id);
  if (idx === -1) return undefined;
  const order = db.data.orders[idx];
  db.data.orders[idx] = {
    ...order,
    client_name: update.client_name,
    task_name: update.task_name,
    subject_or_category: update.subject_or_category || null,
    price: update.price,
    note: update.note || null,
    is_done: Boolean(update.is_done),
    is_paid: Boolean(update.is_paid),
  };
  await db.write();
  return db.data.orders[idx];
}

/**
 * Delete an order by ID.
 */
export async function deleteOrder(id) {
  const db = await getDb();
  await db.read();
  const initialLength = db.data.orders.length;
  db.data.orders = db.data.orders.filter(o => o.id !== id);
  await db.write();
  return db.data.orders.length < initialLength;
}