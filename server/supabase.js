const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// prefer service role key for server operations if provided
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const SUPABASE_FETCH_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || 5000);

let supabase = null;
let supabaseInitialized = false;

// Lazy initialization: only create client when first used
// NO automatic initialization - only when explicitly called
function initSupabase() {
  if (supabaseInitialized) return supabase;
  
  const start = Date.now();
  console.log('[Supabase] Initializing client...');
  
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      // Inject fetch with timeout to avoid hanging lambda when Supabase is slow/unreachable
      const fetchWithTimeout = (input, init = {}) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
        return fetch(input, { ...init, signal: controller.signal })
          .finally(() => clearTimeout(id));
      };
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
          fetch: fetchWithTimeout
        }
      });
      console.log(`[Supabase] Client created in ${Date.now() - start}ms`);
    } catch (e) {
      console.error('[Supabase] Failed to create client:', e.message);
    }
  } else {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_KEY');
  }
  
  supabaseInitialized = true;
  return supabase;
}

// ============================================================================
// 資料轉換層：自動處理 camelCase ↔ snake_case
// ============================================================================

/**
 * 將 camelCase 轉換為 snake_case
 * e.g., { plotId, cropType } → { plot_id, crop_type }
 */
function toSnakeCase(obj) {
  if (!obj) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, match => '_' + match.toLowerCase());
    result[snakeKey] = value;
  }
  return result;
}

/**
 * 將 snake_case 轉換為 camelCase
 * e.g., { plot_id, crop_type } → { plotId, cropType }
 */
function toCamelCase(obj) {
  if (!obj) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}


async function getPlots() {
  const start = Date.now();
  try {
    const sb = initSupabase(); 
    if (!sb) throw new Error('Supabase not configured');
    console.log(`[getPlots] Supabase initialized in ${Date.now() - start}ms, fetching data...`);
    const { data, error } = await sb.from('plots').select('*');
    if (error) throw error;
    console.log(`[getPlots] Data fetched in ${Date.now() - start}ms, ${data?.length || 0} rows`);
    return (data || []).map(toCamelCase);
  } catch (e) {
    console.error(`[getPlots] Error after ${Date.now() - start}ms:`, e.message);
    throw e;
  }
}

async function getLogs() {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.from('logs').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(toCamelCase);
}

async function addLog(log) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const normalized = toSnakeCase(log);
  console.log('supabase.addLog normalized payload:', normalized);
  const { data, error } = await sb.from('logs').insert([normalized]).select();
  if (error) throw error;
  return data && data[0] ? toCamelCase(data[0]) : null;
}

async function getInventory() {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  // 先嘗試關聯查詢
  const { data, error } = await sb.from('inventory').select(`
    id, product_name, grade, quantity, harvest_date, location_id,
    storage_locations(id, name, type)
  `);
  if (!error) {
    return (data || []).map(item => ({
      id: item.id,
      productName: item.product_name,
      grade: item.grade,
      quantity: item.quantity,
      harvestDate: item.harvest_date,
      location: item.storage_locations?.name || '未指定',
      locationId: item.storage_locations?.id || item.location_id
    }));
  }
  // 無外鍵時回退：分開查詢
  const { data: inv, error: e1 } = await sb.from('inventory').select('*');
  if (e1) throw e1;
  const locIds = [...new Set((inv || []).map(r => r.location_id).filter(Boolean))];
  let locMap = {};
  if (locIds.length) {
    const { data: locs, error: e2 } = await sb.from('storage_locations').select('id, name, type').in('id', locIds);
    if (!e2) locMap = Object.fromEntries((locs || []).map(l => [l.id, l]));
  }
  return (inv || []).map(item => ({
    ...toCamelCase(item),
    location: locMap[item.location_id]?.name || '未指定'
  }));
}

async function updateInventoryQuantity(id, quantity) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.from('inventory').update({ quantity }).eq('id', id);
  if (error) throw error;
  return data;
}

async function updateInventoryLocation(id, location_id) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.from('inventory').update({ location_id }).eq('id', id);
  if (error) throw error;
  return data;
}

async function deleteInventory(id) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const { error } = await sb.from('inventory').delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}

async function getStorageLocations() {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.from('storage_locations').select('*');
  if (error) throw error;
  return data;
}

async function updateLog(id, logData) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const normalized = toSnakeCase(logData);
  const { data, error } = await sb.from('logs').update(normalized).eq('id', id);
  if (error) throw error;
  return data[0] ? toCamelCase(data[0]) : null;
}

async function getOrders() {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  // 先嘗試關聯查詢
  const { data, error } = await sb.from('orders').select(`
    *,
    order_items(id, product_name, grade, quantity, price, order_id)
  `);
  if (!error) {
    return (data || []).map(order => ({
      ...toCamelCase(order),
      items: (order.order_items || []).map(item => ({
        id: item.id,
        productName: item.product_name,
        grade: item.grade,
        quantity: item.quantity,
        price: item.price,
        orderId: item.order_id
      })),
      orderItems: undefined
    }));
  }
  // 無外鍵時回退：分開查詢再合併
  const { data: orders, error: e1 } = await sb.from('orders').select('*');
  if (e1) throw e1;
  const ids = (orders || []).map(o => String(o.id));
  let itemsByOrder = {};
  if (ids.length) {
    const { data: items, error: e2 } = await sb.from('order_items').select('order_id, id, product_name, grade, quantity, price').in('order_id', ids);
    if (!e2) {
      for (const it of items || []) {
        const key = String(it.order_id);
        (itemsByOrder[key] = itemsByOrder[key] || []).push({
          id: it.id,
          productName: it.product_name,
          grade: it.grade,
          quantity: it.quantity,
          price: it.price,
          orderId: it.order_id
        });
      }
    }
  }
  return (orders || []).map(o => ({ ...toCamelCase(o), items: itemsByOrder[String(o.id)] || [] }));
}

async function updateOrderStatus(id, status) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? toCamelCase(data) : null;
}

async function getCustomers() {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.from('customers').select('*');
  if (error) throw error;
  return (data || []).map(toCamelCase);
}

// 新增訂單及項目（相容 orders.id 為 TEXT 或 UUID 的情況）
async function addOrder(orderData) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  
  // 轉換 camelCase 到 snake_case
  const normalized = toSnakeCase(orderData);
  const { id, customer_name, channel, total, status, order_items } = normalized;

  // 產生或調整訂單編號：確保最後 8 碼為 YYYYMMDD
  const now = new Date();
  const parts = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now)
    .reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  const yyyymmdd = `${parts.year}${parts.month}${parts.day}`;
  const prefix = (channel || 'ORD').toString().toUpperCase();
  let orderId = id;
  if (!orderId) {
    const unique = Math.random().toString(36).slice(2, 6).toUpperCase();
    orderId = `${prefix}-${unique}-${yyyymmdd}`;
  } else if (!orderId.endsWith(yyyymmdd)) {
    orderId = `${orderId}-${yyyymmdd}`;
  }
  
  // 嘗試用傳入的 id 插入（若 orders.id 為 TEXT 會成功）
  let ins = await sb.from('orders')
    .insert([{ id: orderId, customer_name, channel, total, status }])
    .select('id')
    .single();

  if (ins.error) {
    // 若型別不相容（例如 DB 為 UUID），改為不指定 id 讓 DB 產生
    console.log('Order ID as TEXT failed, falling back to UUID auto-gen:', ins.error.message);
    const alt = await sb.from('orders')
      .insert([{ customer_name, channel, total, status }])
      .select('id')
      .single();
    if (alt.error) throw alt.error;
    orderId = String(alt.data.id);
  } else {
    orderId = String(ins.data.id);
  }

  if (order_items && order_items.length > 0) {
    const payload = order_items.map(item => ({
      order_id: orderId,
      product_name: item.product_name,
      grade: item.grade,
      quantity: item.quantity,
      price: item.price,
      origin_plot_id: item.origin_plot_id
    }));
    const itemsRes = await sb.from('order_items').insert(payload);
    if (itemsRes.error) throw itemsRes.error;
  }

  return { ok: true, orderId };
}

// 獲取庫存詳細（多位置多級別）
async function getInventoryV2() {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  // 優先嘗試關聯查詢
  const { data, error } = await sb.from('inventory').select(`
    id, product_name, grade, quantity, location_id, harvest_date,
    storage_locations(id, name, type)
  `);
  if (!error) {
    return (data || []).map(item => ({
      id: item.id,
      productName: item.product_name,
      grade: item.grade,
      quantity: item.quantity,
      location: item.storage_locations?.name || '未指定',
      locationId: item.storage_locations?.id || item.location_id,
      harvestDate: item.harvest_date
    }));
  }
  // 回退路徑：兩段式
  const { data: inv, error: e1 } = await sb.from('inventory').select('*');
  if (e1) throw e1;
  const locIds = [...new Set((inv || []).map(r => r.location_id).filter(Boolean))];
  let locMap = {};
  if (locIds.length) {
    const { data: locs, error: e2 } = await sb.from('storage_locations').select('id, name, type').in('id', locIds);
    if (!e2) locMap = Object.fromEntries((locs || []).map(l => [l.id, l]));
  }
  return (inv || []).map(item => ({
    ...toCamelCase(item),
    location: locMap[item.location_id]?.name || '未指定'
  }));
}

// 獲取庫存匯總（按產品）
async function getInventorySummary() {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.from('v_inventory_summary').select('*');
  if (error) throw error;
  return (data || []).map(row => ({
    productName: row.product_name,
    totalQuantity: row.total_quantity,
    gradeCount: row.grade_count,
    locationCount: row.location_count
  }));
}

// 獲取作物品級配置
async function getProductGrades() {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.from('product_grades').select('*');
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    productName: row.product_name,
    grades: row.grades,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

// 新增或更新庫存項目（支持多位置）
async function upsertInventoryItem(inventoryData) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const normalized = toSnakeCase(inventoryData);
  const { error } = await sb.from('inventory').upsert([{ 
    product_name: normalized.product_name,
    grade: normalized.grade,
    quantity: normalized.quantity,
    location_id: normalized.location_id,
    harvest_date: normalized.harvest_date,
    package_spec: normalized.package_spec,
    batch_id: normalized.batch_id,
    origin_plot_id: normalized.origin_plot_id
  }], { 
    onConflict: 'product_name,grade,location_id'
  });
  
  if (error) throw error;
  return { ok: true };
}

// Move inventory between locations (subtract from source, add/upsert target)
async function moveInventory({ sourceId, targetLocationId, amount }) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  const qty = Number(amount) || 0;
  if (qty <= 0) throw new Error('移動數量需大於 0');

  // fetch source
  const { data: srcRows, error: srcErr } = await sb.from('inventory').select('*').eq('id', sourceId).limit(1);
  if (srcErr) throw srcErr;
  const src = srcRows?.[0];
  if (!src) throw new Error('來源庫存不存在');
  if ((src.quantity || 0) < qty) throw new Error('移動數量超過現有庫存');

  // add to target (upsert)
  const { error: upErr } = await sb.from('inventory').upsert([{
    product_name: src.product_name,
    grade: src.grade,
    location_id: targetLocationId,
    quantity: qty
  }], { onConflict: 'product_name,grade,location_id', ignoreDuplicates: false });
  if (upErr) throw upErr;

  // decrement source
  const remaining = (src.quantity || 0) - qty;
  if (remaining > 0) {
    const { error: updErr } = await sb.from('inventory').update({ quantity: remaining }).eq('id', sourceId);
    if (updErr) throw updErr;
  } else {
    const { error: delErr } = await sb.from('inventory').delete().eq('id', sourceId);
    if (delErr) throw delErr;
  }

  return { ok: true };
}

// Consume inventory quantities by id list
async function consumeInventory(picks = []) {
  const sb = initSupabase(); if (!sb) throw new Error('Supabase not configured');
  for (const pick of picks) {
    const take = Number(pick.quantity) || 0;
    if (take <= 0) continue;
    const { data: rows, error } = await sb.from('inventory').select('*').eq('id', pick.inventoryId).limit(1);
    if (error) throw error;
    const row = rows?.[0];
    if (!row) throw new Error(`庫存不存在: ${pick.inventoryId}`);
    if ((row.quantity || 0) < take) throw new Error(`庫存不足: ${row.id}`);
    const remaining = (row.quantity || 0) - take;
    if (remaining > 0) {
      const { error: updErr } = await sb.from('inventory').update({ quantity: remaining }).eq('id', row.id);
      if (updErr) throw updErr;
    } else {
      const { error: delErr } = await sb.from('inventory').delete().eq('id', row.id);
      if (delErr) throw delErr;
    }
  }
  return { ok: true };
}

module.exports = { 
  supabase: initSupabase(), // Return initialized client or null
  getPlots, 
  getLogs, 
  addLog, 
  updateLog, 
  getInventory, 
  updateInventoryQuantity, 
  updateInventoryLocation, 
  deleteInventory,
  getStorageLocations, 
  getOrders, 
  updateOrderStatus, 
  getCustomers,
  addOrder,
  getInventoryV2,
  getInventorySummary,
  getProductGrades,
  upsertInventoryItem,
  moveInventory,
  consumeInventory,
  updateInventoryQuantity,
  toSnakeCase,
  toCamelCase
};
