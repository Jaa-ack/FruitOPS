const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

/**
 * Direct REST API client - bypasses Supabase SDK for faster serverless performance
 * Uses native fetch with timeout protection
 */

const FETCH_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || 5000);

// Flag to indicate this module is the Supabase client (for compatibility with old checks)
const IS_CONFIGURED = !!(SUPABASE_URL && SUPABASE_KEY);
if (IS_CONFIGURED) {
  console.log('[DirectAPI] Supabase client initialized with REST API');
}

async function fetchSupabase(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      ...options,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase API error: ${response.status} ${error}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Snake to camel case conversion
function toCamelCase(obj) {
  if (!obj) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

// Camel to snake case conversion
function toSnakeCase(obj) {
  if (!obj) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, match => '_' + match.toLowerCase());
    result[snakeKey] = value;
  }
  return result;
}

// API functions using direct REST
async function getPlots() {
  const start = Date.now();
  console.log('[DirectAPI] Fetching plots...');
  const data = await fetchSupabase('/plots?select=*');
  console.log(`[DirectAPI] Plots fetched in ${Date.now() - start}ms, ${data.length} rows`);
  return data.map(toCamelCase);
}

async function getLogs() {
  const data = await fetchSupabase('/logs?select=*&order=date.desc');
  return data.map(toCamelCase);
}

async function getInventory() {
  const data = await fetchSupabase('/inventory?select=id,product_name,grade,quantity,harvest_date,location_id,storage_locations(id,name,type)');
  return data.map(item => ({
    id: item.id,
    productName: item.product_name,
    grade: item.grade,
    quantity: item.quantity,
    harvestDate: item.harvest_date,
    location: item.storage_locations?.name || '未指定',
    locationId: item.storage_locations?.id || item.location_id
  }));
}

async function getOrders() {
  const orders = await fetchSupabase('/orders?select=*');
  const orderIds = orders.map(o => o.id);
  
  let itemsByOrder = {};
  if (orderIds.length > 0) {
    const items = await fetchSupabase(`/order_items?select=*&order_id=in.(${orderIds.join(',')})`);
    for (const item of items) {
      const orderId = String(item.order_id);
      if (!itemsByOrder[orderId]) itemsByOrder[orderId] = [];
      itemsByOrder[orderId].push({
        id: item.id,
        productName: item.product_name,
        grade: item.grade,
        quantity: item.quantity,
        price: item.price,
        orderId: item.order_id
      });
    }
  }
  
  return orders.map(o => ({
    ...toCamelCase(o),
    items: itemsByOrder[String(o.id)] || []
  }));
}

async function getCustomers() {
  const data = await fetchSupabase('/customers?select=*');
  return data.map(toCamelCase);
}

async function addLog(log) {
  const normalized = toSnakeCase(log);
  const data = await fetchSupabase('/logs', {
    method: 'POST',
    body: JSON.stringify(normalized)
  });
  return data[0] ? toCamelCase(data[0]) : null;
}

module.exports = {
  // Flag for compatibility with old SDK checks in server/index.js
  // Old code checks: if (!getSupabaseClient().supabase) => use localdb
  // This flag makes all endpoints use Supabase when configured
  supabase: IS_CONFIGURED ? true : null,
  
  // All API methods
  getPlots,
  getLogs,
  getInventory,
  getOrders,
  getCustomers,
  addLog,
  fetchSupabase,
  toCamelCase,
  toSnakeCase
};
