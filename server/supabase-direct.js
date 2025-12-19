const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

/**
 * Direct REST API client - bypasses Supabase SDK for faster serverless performance
 * Uses native fetch with timeout protection
 * Implements all methods from server/supabase.js but with direct REST calls
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
        // For POST/PATCH, request returned data for confirmation
        'Prefer': options.method === 'POST' || options.method === 'PATCH' ? 'return=representation' : 'return=minimal',
        ...options.headers
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase API error: ${response.status} ${error}`);
    }

    // For some requests (especially DELETE), there's no response body
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0' || !response.body) {
      return [];
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

// ============================================================================
// API Methods - Direct REST API implementations
// ============================================================================

async function getPlots() {
  const start = Date.now();
  console.log('[DirectAPI] Fetching plots...');
  try {
    const data = await fetchSupabase('/plots?select=*');
    console.log(`[DirectAPI] Plots fetched in ${Date.now() - start}ms, ${data.length} rows`);
    return data.map(toCamelCase);
  } catch (e) {
    console.error(`[DirectAPI] getPlots error after ${Date.now() - start}ms:`, e.message);
    throw e;
  }
}

async function getLogs() {
  const data = await fetchSupabase('/logs?select=*&order=date.desc');
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

async function updateLog(id, logData) {
  const normalized = toSnakeCase(logData);
  const data = await fetchSupabase(`/logs?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(normalized)
  });
  return data[0] ? toCamelCase(data[0]) : null;
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

async function updateInventoryQuantity(id, quantity) {
  const data = await fetchSupabase(`/inventory?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity })
  });
  return data[0] ? toCamelCase(data[0]) : null;
}

async function updateInventoryLocation(id, location_id) {
  const data = await fetchSupabase(`/inventory?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ location_id })
  });
  return data[0] ? toCamelCase(data[0]) : null;
}

async function deleteInventory(id) {
  await fetchSupabase(`/inventory?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return { ok: true };
}

async function getStorageLocations() {
  const data = await fetchSupabase('/storage_locations?select=*');
  return data.map(toCamelCase);
}

async function getOrders() {
  const orders = await fetchSupabase('/orders?select=*');
  const orderIds = orders.map(o => o.id);
  
  if (orderIds.length === 0) {
    return [];
  }
  
  // Fetch order items for each order
  const items = await fetchSupabase(`/order_items?order_id=in.(${orderIds.map(id => encodeURIComponent(id)).join(',')})`);
  
  const itemsByOrder = {};
  items.forEach(item => {
    const oid = String(item.order_id);
    if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
    itemsByOrder[oid].push({
      productName: item.product_name,
      grade: item.grade,
      qty: item.quantity,
      price: item.price
    });
  });
  
  return orders.map(order => ({
    ...toCamelCase(order),
    items: itemsByOrder[String(order.id)] || []
  }));
}

async function updateOrderStatus(id, status) {
  const data = await fetchSupabase(`/orders?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  return data[0] ? toCamelCase(data[0]) : null;
}

async function getCustomers() {
  const data = await fetchSupabase('/customers?select=*');
  return data.map(toCamelCase);
}

async function findCustomerByName(name) {
  if (!name) return null;
  const rows = await fetchSupabase(`/customers?name=eq.${encodeURIComponent(name)}&select=*`);
  return rows && rows.length ? toCamelCase(rows[0]) : null;
}

async function addCustomer(customer) {
  const normalized = toSnakeCase(customer);
  const rows = await fetchSupabase('/customers', {
    method: 'POST',
    body: JSON.stringify(normalized)
  });
  return rows && rows[0] ? toCamelCase(rows[0]) : null;
}

async function updateCustomer(id, updates) {
  const normalized = toSnakeCase(updates);
  const rows = await fetchSupabase(`/customers?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(normalized)
  });
  return rows && rows[0] ? toCamelCase(rows[0]) : null;
}

async function upsertCustomerByName({ name, phone, segment }) {
  const existing = await findCustomerByName(name);
  if (existing) return existing;
  const created = await addCustomer({ name, phone: phone || '', segment: segment || 'New', totalSpent: 0 });
  return created;
}

/**
 * 計算客戶 RFM 分級
 * R = Recency (最近購買天數，越少越好)
 * F = Frequency (購買次數)
 * M = Monetary (消費金額)
 * 根據 R/F/M 綜合評分，自動分級為 VIP / Stable / Regular / New / At Risk
 */
async function calculateAndApplyCustomerSegmentation() {
  try {
    // 取得所有客戶與訂單
    const customers = await getCustomers();
    const orders = await getOrders();
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 為每個客戶計算 RFM 分數
    const segmentation = customers.map(cust => {
      // 計算 Recency：最後一次訂單距今天數
      const custOrders = Array.isArray(orders) ? orders.filter((o) => 
        (o.customerName || o.customer_name || '').trim().toLowerCase() === 
        (cust.name || '').trim().toLowerCase()
      ) : [];
      
      let recencyDays = 999; // 無訂單，設為很大的數
      if (custOrders.length > 0) {
        const lastOrder = custOrders.reduce((latest, curr) => {
          const currDate = curr.createdAt || curr.created_at || today;
          const latestDate = latest.createdAt || latest.created_at || today;
          return currDate > latestDate ? curr : latest;
        });
        const lastDate = new Date(lastOrder.createdAt || lastOrder.created_at || today);
        recencyDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      }
      
      // 計算 Frequency：訂單數
      const frequency = custOrders.length;
      
      // 計算 Monetary：總消費金額
      const monetary = custOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      
      // RFM 綜合評分邏輯
      let segment = 'Regular';
      if (frequency === 0) {
        segment = 'New';
      } else if (monetary >= 100000 && frequency >= 5 && recencyDays <= 60) {
        segment = 'VIP';
      } else if (monetary >= 50000 && frequency >= 3 && recencyDays <= 90) {
        segment = 'Stable';
      } else if (recencyDays > 180 && frequency > 0) {
        segment = 'At Risk';
      }
      
      return {
        id: cust.id,
        name: cust.name,
        segment,
        rfm: { recencyDays, frequency, monetary }
      };
    });
    
    return segmentation;
  } catch (err) {
    console.error('[RFM] Segmentation calculation failed:', err);
    return [];
  }
}

/**
 * 批量更新客戶分級
 */
async function updateCustomerSegments(segmentUpdates = []) {
  try {
    // Supabase REST 不支援不同值的批量 PATCH，逐筆更新
    for (const upd of (segmentUpdates || [])) {
      if (!upd || !upd.id) continue;
      await fetchSupabase(`/customers?id=eq.${encodeURIComponent(upd.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ segment: upd.segment })
      });
    }
    return { ok: true };
  } catch (err) {
    console.error('[Segmentation] Batch update failed:', err);
    throw err;
  }
}

/**
 * 手動更新單個客戶分級
 */
async function updateCustomerSegment(customerId, segment) {
  try {
    const result = await fetchSupabase(`/customers?id=eq.${customerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ segment })
    });
    return result[0] || { ok: true };
  } catch (err) {
    console.error('[Segmentation] Update failed:', err);
    throw err;
  }
}

async function addOrder(orderData) {
  // Prepare order data
  const orderInsert = {
    customer_name: orderData.customer_name,
    channel: orderData.channel,
    total: orderData.total,
    status: orderData.status
  };
  
  // Try with custom ID first (if database supports TEXT IDs)
  let orderId = orderData.id;
  let orders;
  
  try {
    orders = await fetchSupabase('/orders', {
      method: 'POST',
      body: JSON.stringify({ ...orderInsert, id: orderId })
    });
    orderId = orders[0]?.id || orderId;
  } catch (err) {
    // If TEXT ID fails (e.g., database expects UUID), retry without ID
    if (err.message.includes('uuid') || err.message.includes('22P02')) {
      console.log('Order ID as TEXT failed, falling back to UUID auto-gen');
      orders = await fetchSupabase('/orders', {
        method: 'POST',
        body: JSON.stringify(orderInsert)
      });
      orderId = orders[0]?.id;
    } else {
      throw err;
    }
  }
  
  // Add order items
  if (orderData.order_items && orderData.order_items.length > 0) {
    const itemsToInsert = orderData.order_items.map(item => ({
      order_id: orderId,
      product_name: item.product_name,
      grade: item.grade,
      quantity: item.quantity,
      price: item.price,
      origin_plot_id: item.origin_plot_id
    }));
    
    await fetchSupabase('/order_items', {
      method: 'POST',
      body: JSON.stringify(itemsToInsert)
    });
  }
  
  return { id: orderId };
}

async function getInventoryV2() {
  const data = await fetchSupabase('/inventory?select=id,product_name,grade,quantity,harvest_date,package_spec,batch_id,origin_plot_id,location_id,storage_locations(id,name,type)');
  return data.map(item => ({
    id: item.id,
    productName: item.product_name,
    grade: item.grade,
    quantity: item.quantity,
    harvestDate: item.harvest_date,
    packageSpec: item.package_spec,
    batchId: item.batch_id,
    originPlotId: item.origin_plot_id,
    location: item.storage_locations?.name || '未指定',
    locationId: item.storage_locations?.id || item.location_id
  }));
}

async function getInventorySummary() {
  // Get aggregated summary from inventory
  // Note: Supabase REST API doesn't directly support aggregation,
  // so we fetch all and compute client-side
  const inventory = await getInventory();
  const summary = {};
  
  inventory.forEach(item => {
    if (!summary[item.productName]) {
      summary[item.productName] = {
        product_name: item.productName,
        total_quantity: 0,
        grade_count: new Set(),
        location_count: new Set()
      };
    }
    summary[item.productName].total_quantity += item.quantity;
    summary[item.productName].grade_count.add(item.grade);
    summary[item.productName].location_count.add(item.location);
  });
  
  return Object.values(summary).map(s => ({
    product_name: s.product_name,
    total_quantity: s.total_quantity,
    grade_count: s.grade_count.size,
    location_count: s.location_count.size
  }));
}

async function getProductGrades() {
  // This might be from a product_grades table or just hardcoded
  // Try to fetch from database first
  try {
    const data = await fetchSupabase('/product_grades?select=*');
    return data.map(toCamelCase);
  } catch (e) {
    // Fallback to defaults if table doesn't exist
    return [
      { product_name: '桃子', grades: ['A', 'B', 'C'] },
      { product_name: '柿子', grades: ['A', 'B'] },
      { product_name: '水梨', grades: ['A', 'B', 'C'] },
      { product_name: '蜜蘋果', grades: ['A', 'B', 'C'] }
    ];
  }
}

async function upsertInventoryItem(inventoryData) {
  // Insert or update inventory item by (product_name, grade, location_id)
  const normalized = toSnakeCase(inventoryData);
  const productName = normalized.product_name;
  const grade = normalized.grade || 'A';
  const locationId = normalized.location_id;
  const addQty = Number(normalized.quantity || 0);

  if (!productName || !locationId) {
    throw new Error('upsertInventoryItem requires productName and locationId');
  }

  // Find existing item with same product/grade/location
  const existing = await fetchSupabase(
    `/inventory?product_name=eq.${encodeURIComponent(productName)}&grade=eq.${encodeURIComponent(grade)}&location_id=eq.${encodeURIComponent(locationId)}&select=id,quantity`
  );

  if (existing && existing.length > 0) {
    const current = existing[0];
    const newQty = (Number(current.quantity) || 0) + addQty;
    await updateInventoryQuantity(current.id, newQty);
    return { id: current.id, productName, grade, quantity: newQty, locationId };
  }

  // Otherwise, create new item and return representation
  const created = await fetchSupabase('/inventory', {
    method: 'POST',
    body: JSON.stringify({
      product_name: productName,
      grade,
      quantity: addQty,
      location_id: locationId,
      harvest_date: normalized.harvest_date,
      package_spec: normalized.package_spec,
      batch_id: normalized.batch_id,
      origin_plot_id: normalized.origin_plot_id
    })
  });

  return created[0] ? toCamelCase(created[0]) : null;
}

async function moveInventory({ sourceId, targetLocationId, amount }) {
  // Fetch source inventory
  const sources = await fetchSupabase(`/inventory?id=eq.${encodeURIComponent(sourceId)}`);
  if (!sources || sources.length === 0) {
    throw new Error(`Source inventory ${sourceId} not found`);
  }
  
  const source = sources[0];
  const qty = Number(amount) || 0;
  
  if (qty <= 0) {
    throw new Error('移動數量需大於 0');
  }
  
  if ((source.quantity || 0) < qty) {
    throw new Error('移動數量超過現有庫存');
  }
  
  // Try to find target location with same product/grade
  const targets = await fetchSupabase(
    `/inventory?product_name=eq.${encodeURIComponent(source.product_name)}&grade=eq.${encodeURIComponent(source.grade || 'A')}&location_id=eq.${encodeURIComponent(targetLocationId)}`
  );
  
  if (targets && targets.length > 0) {
    // Update existing target
    const target = targets[0];
    await updateInventoryQuantity(target.id, (target.quantity || 0) + qty);
  } else {
    // Create new inventory item at target location
    await upsertInventoryItem({
      product_name: source.product_name,
      grade: source.grade || 'A',
      quantity: qty,
      location_id: targetLocationId,
      harvest_date: source.harvest_date
    });
  }
  
  // Update source quantity
  const remaining = (source.quantity || 0) - qty;
  if (remaining > 0) {
    await updateInventoryQuantity(sourceId, remaining);
  } else {
    await deleteInventory(sourceId);
  }
  
  return { ok: true };
}

async function consumeInventory(picks = []) {
  // Consume inventory for each pick (order fulfillment)
  for (const pick of picks) {
    const qty = Number(pick.quantity) || 0;
    if (qty <= 0) continue;
    
    const invId = pick.inventoryId || pick.inventory_id;
    if (!invId) continue;
    
    // Get current quantity
    const items = await fetchSupabase(`/inventory?id=eq.${encodeURIComponent(invId)}`);
    if (!items || items.length === 0) {
      throw new Error(`Inventory item ${invId} not found`);
    }
    
    const item = items[0];
    if ((item.quantity || 0) < qty) {
      throw new Error(`Not enough inventory for ${invId}`);
    }
    
    const remaining = (item.quantity || 0) - qty;
    if (remaining > 0) {
      await updateInventoryQuantity(invId, remaining);
    } else {
      await deleteInventory(invId);
    }
  }
  
  return { ok: true };
}

module.exports = {
  // Flag for compatibility with old SDK checks in server/index.js
  // Old code checks: if (!getSupabaseClient().supabase) => use localdb
  // This flag makes all endpoints use Supabase when configured
  supabase: IS_CONFIGURED ? true : null,
  
  // Core API methods
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
  findCustomerByName,
  addCustomer,
  updateCustomer,
  upsertCustomerByName,
  addOrder,
  getInventoryV2,
  getInventorySummary,
  getProductGrades,
  upsertInventoryItem,
  moveInventory,
  consumeInventory,
  
  // Customer segmentation methods
  calculateAndApplyCustomerSegmentation,
  updateCustomerSegments,
  updateCustomerSegment,
  
  // Utility functions
  fetchSupabase,
  toCamelCase,
  toSnakeCase
};
