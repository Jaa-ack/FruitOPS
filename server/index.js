// Only load .env automatically in non-test and non-serverless environments
// Vercel injects env vars directly into process.env, dotenv would override them with empty values
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  require('dotenv').config();
}
const express = require('express');
const bodyParser = require('body-parser');
const { rateLimit } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { GoogleGenAI } = require('@google/genai');
const { randomUUID } = require('crypto');

// Check if Supabase is properly configured (required for all operations)
const SUPABASE_READY = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY));

// Lazy load supabaseClient to avoid blocking in serverless
let supabaseClient = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const start = Date.now();
    // Use direct REST API for better serverless performance
    try {
      supabaseClient = require('./supabase-direct');
      console.log(`[Init] Direct Supabase API loaded in ${Date.now() - start}ms, ready=${SUPABASE_READY}`);
    } catch (e) {
      console.error('[Init] Failed to load supabase-direct:', e.message);
      supabaseClient = { supabase: null, getPlots: async () => [] }; // Fallback
    }
  }
  return supabaseClient;
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;
const REQ_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS || 12000);
// In serverless environments (Vercel), always disable local DB fallback unless explicitly set to 0
const DISABLE_LOCAL_DB = process.env.VERCEL 
  ? (process.env.DISABLE_LOCAL_DB !== '0')  // Vercel: default to true unless explicitly disabled
  : (process.env.DISABLE_LOCAL_DB === '1'); // Local: default to false unless explicitly enabled

// Health check routes FIRST - ULTRA MINIMAL, no dependencies
app.get('/', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({
    status: 'ok',
    db: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY ? 'supabase' : 'local'
  }));
});

app.get('/api/healthz', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({
    status: 'ok',
    db: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY ? 'supabase' : 'local'
  }));
});

app.get('/healthz', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({
    status: 'ok',
    db: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY ? 'supabase' : 'local'
  }));
});

// Debug middleware - log all requests
app.use((req, res, next) => {
  const start = Date.now();
  const reqId = randomUUID();
  res.setHeader('X-Request-Id', reqId);
  res.locals.reqId = reqId;

  let finished = false;
  const timeout = setTimeout(() => {
    if (finished) return;
    console.error(`[TIMEOUT] ${req.method} ${req.path} id=${reqId} after ${Date.now() - start}ms`);
    if (!res.headersSent) {
      res.status(504).json({ error: 'request timeout', reqId, durationMs: Date.now() - start });
    }
  }, REQ_TIMEOUT_MS);

  res.on('finish', () => {
    finished = true;
    clearTimeout(timeout);
    console.log(`[DEBUG] ${req.method} ${req.path} → ${res.statusCode} id=${reqId} ${Date.now() - start}ms`);
  });
  res.on('close', () => clearTimeout(timeout));

  console.log(`[DEBUG] ${req.method} ${req.path} id=${reqId}`);
  next();
});

app.use(bodyParser.json());

// Rate limiter (simple protective defaults)
// In serverless/proxy environments, skip entirely to avoid undefined IP issues
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' || process.env.VERCEL === '1',
  keyGenerator: (req) => {
    const xff = req.headers['x-forwarded-for'];
    if (xff && typeof xff === 'string') {
      return xff.split(',')[0].trim();
    }
    const xri = req.headers['x-real-ip'];
    if (xri && typeof xri === 'string') return xri.trim();
    try {
      return req.socket?.remoteAddress?.toString() || 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }
});
app.use(limiter);

// Simple CORS for dev (if not using Vite proxy)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

let localDbContainer = null;
async function ensureLocalDB() {
  if (!localDbContainer) {
    localDbContainer = require('./db');
    await localDbContainer.init();
  }
  return localDbContainer;
}

app.get('/api/plots', async (req, res) => {
  const reqId = req.get('x-request-id') || 'no-id';
  try {
    const start = Date.now();
    console.log(`[PLOTS-REQ] ${reqId} START at ${new Date().toISOString()}`);
    console.log(`[PLOTS-REQ] ${reqId} SUPABASE_READY=${SUPABASE_READY}, DISABLE_LOCAL_DB=${DISABLE_LOCAL_DB}`);
    
    if (!SUPABASE_READY) {
      console.log(`[PLOTS-REQ] ${reqId} Using local DB fallback`);
      if (DISABLE_LOCAL_DB) {
        console.log(`[PLOTS-REQ] ${reqId} ERROR: Local DB disabled and Supabase not ready`);
        return res.status(503).json({ error: 'Supabase not configured and local DB disabled' });
      }
      const db = await ensureLocalDB();
      const data = db.data.plots || [];
      const elapsed = Date.now() - start;
      console.log(`[PLOTS-REQ] ${reqId} Response: ${data.length} plots from local DB in ${elapsed}ms`);
      return res.json(data);
    }
    
    console.log(`[PLOTS-REQ] ${reqId} Fetching from Supabase API...`);
    const client = getSupabaseClient();
    const rows = await client.getPlots();
    const elapsed = Date.now() - start;
    console.log(`[PLOTS-REQ] ${reqId} Response: ${rows ? rows.length : 0} plots from Supabase in ${elapsed}ms`);
    res.json(rows || []);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`[PLOTS-ERROR] ${reqId} Exception after ${elapsed}ms: ${err.message}`);
    console.error(`[PLOTS-ERROR] ${reqId} Stack:`, err.stack);
    res.status(500).json({ error: '取得 plots 失敗', details: err.message, reqId });
  }
});

// Direct Supabase REST API test endpoint (bypasses SDK)
app.get('/api/plots/direct', async (req, res) => {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }
    
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${url}/rest/v1/plots`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const data = await response.json();
    const duration = Date.now() - start;
    
    res.json({
      success: true,
      duration_ms: duration,
      count: data.length,
      data: data
    });
  } catch (err) {
    console.error('Direct API test error:', err);
    res.status(500).json({ error: 'Direct API failed', details: err.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      return res.json(db.data.logs || []);
    }
    const rows = await getSupabaseClient().getLogs();
    res.json(rows || []);
  } catch (err) {
    console.error('GET /api/logs error', err);
    res.status(500).json({ error: '取得 logs 失敗', details: err.message });
  }
});

app.post(
  '/api/logs',
  // validation
  body('id').isString().notEmpty(),
  body('date').isISO8601().withMessage('date 必須為 YYYY-MM-DD'),
  body('plotId').isString().notEmpty(),
  body('activity').isString().notEmpty(),
  body('cropType').optional().isString(),
  body('notes').optional().isString(),
  body('cost').optional().isNumeric(),
  body('worker').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }
    const { id, date, plotId, activity, cropType, notes, cost, worker } = req.body;
    try {
      if (!SUPABASE_READY) {
        if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
        const db = await ensureLocalDB();
        db.data.logs = db.data.logs || [];
        db.data.logs.unshift({ id, date, plotId, activity, cropType, notes, cost, worker });
        await db.write();
        return res.status(201).json({ ok: true });
      }
      await getSupabaseClient().addLog({ id, date, plotId, activity, cropType, notes, cost, worker });
      res.status(201).json({ ok: true });
    } catch (err) {
      console.error('POST /api/logs error', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

// Update log
app.put('/api/logs/:id', async (req, res) => {
  const { id } = req.params;
  const logData = req.body;
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      db.data.logs = db.data.logs || [];
      const idx = db.data.logs.findIndex(l => l.id === id);
      if (idx >= 0) {
        db.data.logs[idx] = { ...db.data.logs[idx], ...logData };
        await db.write();
      }
      return res.json({ ok: true });
    }
    await getSupabaseClient().updateLog(id, logData);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/logs/:id error', err);
    res.status(500).json({ error: '更新日誌失敗', details: err.message });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      return res.json(db.data.inventory || []);
    }
    const rows = await getSupabaseClient().getInventory();
    res.json(rows || []);
  } catch (err) {
    console.error('GET /api/inventory error', err);
    res.status(500).json({ error: '取得 inventory 失敗', details: err.message });
  }
});

// Update inventory quantity
app.put('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      db.data.inventory = db.data.inventory || [];
      const idx = db.data.inventory.findIndex(i => i.id === id);
      if (idx >= 0) {
        db.data.inventory[idx].quantity = quantity;
        await db.write();
      }
      return res.json({ ok: true });
    }
    await getSupabaseClient().updateInventoryQuantity(id, quantity);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/inventory error', err);
    res.status(500).json({ error: '更新庫存失敗', details: err.message });
  }
});

// Update inventory location
app.patch('/api/inventory/:id/location', async (req, res) => {
  const { id } = req.params;
  const { location_id } = req.body;
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      db.data.inventory = db.data.inventory || [];
      const idx = db.data.inventory.findIndex(i => i.id === id);
      if (idx >= 0) {
        db.data.inventory[idx].location_id = location_id;
        await db.write();
      }
      return res.json({ ok: true });
    }
    await getSupabaseClient().updateInventoryLocation(id, location_id);
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/inventory location error', err);
    res.status(500).json({ error: '更新庫位失敗', details: err.message });
  }
});

// Delete inventory item
app.delete('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      db.data.inventory = db.data.inventory || [];
      db.data.inventory = db.data.inventory.filter(i => i.id !== id);
      await db.write();
      return res.json({ ok: true });
    }
    await getSupabaseClient().deleteInventory(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/inventory/:id error', err);
    res.status(500).json({ error: '刪除庫存失敗', details: err.message });
  }
});

// Move inventory between locations
app.post('/api/inventory-move', async (req, res) => {
  const { sourceId, targetLocationId, amount } = req.body || {};
  try {
    if (!sourceId || !targetLocationId) {
      return res.status(400).json({ error: 'sourceId 與 targetLocationId 必填' });
    }
    if (!SUPABASE_READY) {
      const db = await ensureLocalDB();
      db.data.inventory = db.data.inventory || [];
      const idx = db.data.inventory.findIndex(i => i.id === sourceId);
      if (idx < 0) return res.status(404).json({ error: '來源不存在' });
      const src = db.data.inventory[idx];
      const qty = Number(amount) || 0;
      if (qty <= 0) return res.status(400).json({ error: '移動數量需大於 0' });
      if ((src.quantity || 0) < qty) return res.status(400).json({ error: '移動數量超過現有庫存' });
      // add to target
      const targetIdx = db.data.inventory.findIndex(i => i.product_name === src.product_name && i.grade === src.grade && (i.location_id === targetLocationId || i.locationId === targetLocationId));
      if (targetIdx >= 0) {
        db.data.inventory[targetIdx].quantity = Number(db.data.inventory[targetIdx].quantity || 0) + qty;
      } else {
        db.data.inventory.push({
          id: `inv-${Date.now()}`,
          product_name: src.product_name,
          grade: src.grade,
          quantity: qty,
          location_id: targetLocationId
        });
      }
      // deduct source
      const remaining = (src.quantity || 0) - qty;
      if (remaining > 0) {
        db.data.inventory[idx].quantity = remaining;
      } else {
        db.data.inventory.splice(idx, 1);
      }
      await db.write();
      return res.json({ ok: true });
    }
    await getSupabaseClient().moveInventory({ sourceId, targetLocationId, amount });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/inventory-move error', err);
    res.status(500).json({ error: '庫存移動失敗', details: err.message });
  }
});

// Get storage locations
app.get('/api/storage-locations', async (req, res) => {
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      // 無本地儲位資料，回傳空陣列
      return res.json([]);
    }
    const rows = await getSupabaseClient().getStorageLocations();
    res.json(rows || []);
  } catch (err) {
    console.error('GET /api/storage-locations error', err);
    res.status(500).json({ error: '取得儲位失敗', details: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      const rows = db.data.orders || [];
      const mapped = rows.map(r => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items }));
      return res.json(mapped);
    }
    const rows = await getSupabaseClient().getOrders();
    const mapped = (rows || []).map(r => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items }));
    res.json(mapped);
  } catch (err) {
    console.error('GET /api/orders error', err);
    res.status(500).json({ error: '取得 orders 失敗', details: err.message });
  }
});

// Create new order
app.post('/api/orders', async (req, res) => {
  const { customerName, channel, source, items, total, payment_status, status } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: '訂單必須包含至少一項商品' });
  }
  
  try {
    // 產生結尾為 YYYYMMDD 的訂單編號，確保日期在最後
    const tz = 'Asia/Taipei';
    const d = new Date();
    const parts = new Intl.DateTimeFormat('zh-TW', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(d)
      .reduce((acc, p) => (acc[p.type] = p.value, acc), {});
    const yyyymmdd = `${parts.year}${parts.month}${parts.day}`;
    const prefix = (channel || 'ORD').toString().toUpperCase();
    const unique = Math.random().toString(36).slice(2, 6).toUpperCase();
    const orderId = `${prefix}-${unique}-${yyyymmdd}`; // 例如: DIRECT-ABCD-20251216

    const orderData = {
      id: orderId,
      customer_name: customerName || '未命名客戶',
      channel: channel || 'Direct',
      source: source || 'Other',
      total: Number(total) || 0,
      payment_status: payment_status || 'Unpaid',
      status: status || 'Pending',
      order_items: items.map(item => ({
        product_name: item.productName,
        grade: item.grade || 'A',
        quantity: Number(item.qty) || 0,
        price: Number(item.price) || 0,
        origin_plot_id: item.originPlotId || item.origin_plot_id || null
      }))
    };

    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      db.data.orders = db.data.orders || [];
      db.data.orders.unshift({
        id: orderId,
        customerName: orderData.customer_name,
        channel: orderData.channel,
        source: orderData.source,
        items: JSON.stringify(items),
        total: orderData.total,
        status: orderData.status,
        payment_status: orderData.payment_status,
        date: new Date().toISOString()
      });
      // 同步建立客戶（若不存在）
      db.data.customers = db.data.customers || [];
      const exists = db.data.customers.find(c => (c.name || '').trim() === (orderData.customer_name || '').trim());
      if (!exists) {
        db.data.customers.push({
          id: `C-${Date.now()}`,
          name: orderData.customer_name,
          phone: '',
          segment: 'New',
          totalSpent: 0,
          lastOrderDate: new Date().toISOString()
        });
      } else {
        exists.lastOrderDate = new Date().toISOString();
      }
      await db.write();
      return res.status(201).json({ ok: true, orderId });
    }

    await getSupabaseClient().addOrder(orderData);
    // 確保客戶存在（以名稱為準則 upsert）
    try {
      await getSupabaseClient().upsertCustomerByName({ name: orderData.customer_name, phone: '', segment: 'New' });
    } catch (e) {
      console.warn('Upsert customer after order failed:', e.message);
    }
    res.status(201).json({ ok: true, orderId });
  } catch (err) {
    console.error('POST /api/orders error', err);
    res.status(500).json({ error: '新增訂單失敗', details: err.message });
  }
});

// Update order status
app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      db.data.orders = db.data.orders || [];
      const idx = db.data.orders.findIndex(o => o.id === id);
      if (idx >= 0) {
        db.data.orders[idx].status = status;
        await db.write();
      }
      return res.json({ ok: true });
    }
    await getSupabaseClient().updateOrderStatus(id, status);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/orders error', err);
    res.status(500).json({ error: '更新訂單失敗', details: err.message });
  }
});

// Consume inventory for an order (picking) and update status
app.post('/api/orders/:id/pick', async (req, res) => {
  const { id } = req.params;
  const { picks = [], nextStatus = 'Confirmed' } = req.body || {};
  try {
    if (!Array.isArray(picks) || picks.length === 0) {
      return res.status(400).json({ error: 'picks 必須為非空陣列' });
    }

    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      db.data.inventory = db.data.inventory || [];
      for (const pick of picks) {
        const take = Number(pick.quantity) || 0;
        if (take <= 0) continue;
        const idx = db.data.inventory.findIndex(i => i.id === pick.inventoryId);
        if (idx < 0) return res.status(400).json({ error: `庫存不存在 ${pick.inventoryId}` });
        const row = db.data.inventory[idx];
        if ((row.quantity || 0) < take) return res.status(400).json({ error: `庫存不足 ${pick.inventoryId}` });
        const remaining = (row.quantity || 0) - take;
        if (remaining > 0) db.data.inventory[idx].quantity = remaining; else db.data.inventory.splice(idx, 1);
      }
      await db.write();
      // update order status
      db.data.orders = db.data.orders || [];
      const oIdx = db.data.orders.findIndex(o => o.id === id);
      if (oIdx >= 0) { db.data.orders[oIdx].status = nextStatus; await db.write(); }
      return res.json({ ok: true });
    }

    await getSupabaseClient().consumeInventory(picks);
    await getSupabaseClient().updateOrderStatus(id, nextStatus);
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/orders/:id/pick error', err);
    res.status(500).json({ error: '拣货/扣庫存失敗', details: err.message });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      return res.json(db.data.customers || []);
    }
    const rows = await getSupabaseClient().getCustomers();
    res.json(rows || []);
  } catch (err) {
    console.error('GET /api/customers error', err);
    res.status(500).json({ error: '取得客戶失敗', details: err.message });
  }
});

// 新增客戶
app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, segment } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name 必填' });
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      db.data.customers = db.data.customers || [];
      const exists = db.data.customers.find(c => (c.name || '').trim() === name.trim());
      if (exists) return res.json(exists);
      const row = { id: `C-${Date.now()}`, name, phone: phone || '', segment: segment || 'New', totalSpent: 0, lastOrderDate: null };
      db.data.customers.push(row);
      await db.write();
      return res.status(201).json(row);
    }
    const created = await getSupabaseClient().upsertCustomerByName({ name, phone, segment });
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/customers error', err);
    res.status(500).json({ error: '新增客戶失敗', details: err.message });
  }
});

// 更新客戶資訊
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      db.data.customers = db.data.customers || [];
      const idx = db.data.customers.findIndex(c => c.id === id);
      if (idx < 0) return res.status(404).json({ error: '客戶不存在' });
      db.data.customers[idx] = { ...db.data.customers[idx], ...updates };
      await db.write();
      return res.json(db.data.customers[idx]);
    }
    const updated = await getSupabaseClient().updateCustomer(id, updates);
    res.json(updated || { ok: true });
  } catch (err) {
    console.error('PUT /api/customers/:id error', err);
    res.status(500).json({ error: '更新客戶失敗', details: err.message });
  }
});

// 新增端點：計算客戶 RFM 分級（自動分級）
app.get('/api/customers/segmentation/calculate', async (req, res) => {
  try {
    const requestId = req.id;
    console.log(`[${requestId}] GET /api/customers/segmentation/calculate`);
    
    if (!SUPABASE_READY) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }
    
    const client = getSupabaseClient();
    const segmentation = await client.calculateAndApplyCustomerSegmentation();
    
    res.json({ ok: true, segmentation });
  } catch (err) {
    console.error('GET /api/customers/segmentation/calculate error', err);
    res.status(500).json({ error: '客戶分級計算失敗', details: err.message });
  }
});

// 新增端點：應用客戶分級（批量）
app.post('/api/customers/segmentation/apply', async (req, res) => {
  try {
    const requestId = req.id;
    const { segmentUpdates } = req.body; // [{ id, segment }, ...]
    console.log(`[${requestId}] POST /api/customers/segmentation/apply with ${segmentUpdates?.length || 0} updates`);
    
    if (!SUPABASE_READY) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }
    
    if (!Array.isArray(segmentUpdates) || segmentUpdates.length === 0) {
      return res.status(400).json({ error: '無有效的分級更新' });
    }
    
    const client = getSupabaseClient();
    await client.updateCustomerSegments(segmentUpdates);
    
    res.json({ ok: true, message: `已更新 ${segmentUpdates.length} 位客戶分級` });
  } catch (err) {
    console.error('POST /api/customers/segmentation/apply error', err);
    res.status(500).json({ error: '客戶分級應用失敗', details: err.message });
  }
});

// 新增端點：更新單個客戶分級
app.put('/api/customers/:id/segment', async (req, res) => {
  try {
    const requestId = req.id;
    const { id } = req.params;
    const { segment } = req.body;
    console.log(`[${requestId}] PUT /api/customers/${id}/segment to ${segment}`);
    
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      const cust = (db.data.customers || []).find(c => c.id === id);
      if (cust) {
        cust.segment = segment;
        db.write();
        return res.json({ ok: true, customer: cust });
      }
      return res.status(404).json({ error: '客戶不存在' });
    }
    
    const client = getSupabaseClient();
    const result = await client.updateCustomerSegment(id, segment);
    
    res.json({ ok: true, customer: result });
  } catch (err) {
    console.error(`PUT /api/customers/:id/segment error`, err);
    res.status(500).json({ error: '客戶分級更新失敗', details: err.message });
  }
});

// 新增端點：獲取庫存摘要（按產品）
app.get('/api/inventory-summary', async (req, res) => {
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      // 本地模式暫無摘要，回傳簡單彙整
      const db = await ensureLocalDB();
      const items = db.data.inventory || [];
      const summary = Object.values(items.reduce((acc, it) => {
        acc[it.productName] = acc[it.productName] || { product_name: it.productName, total_quantity: 0, grade_count: 0, location_count: 0, _grades: new Set(), _locs: new Set() };
        const s = acc[it.productName];
        s.total_quantity += Number(it.quantity || 0);
        if (it.grade) s._grades.add(it.grade);
        if (it.location || it.location_id) s._locs.add(it.location || it.location_id);
        return acc;
      }, {})).map((s) => ({ product_name: s.product_name, total_quantity: s.total_quantity, grade_count: s._grades.size, location_count: s._locs.size }));
      return res.json(summary);
    }
    const data = await getSupabaseClient().getInventorySummary();
    res.json(data || []);
  } catch (err) {
    console.error('GET /api/inventory-summary error', err);
    res.status(500).json({ error: '取得庫存摘要失敗', details: err.message });
  }
});

// 新增端點：獲取庫存詳細（多位置多級別）
app.get('/api/inventory-detail', async (req, res) => {
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      const db = await ensureLocalDB();
      return res.json(db.data.inventory || []);
    }
    const data = await getSupabaseClient().getInventoryV2();
    res.json(data || []);
  } catch (err) {
    console.error('GET /api/inventory-detail error', err);
    res.status(500).json({ error: '取得詳細庫存失敗', details: err.message });
  }
});

// 新增端點：獲取作物品級配置
app.get('/api/product-grades', async (req, res) => {
  try {
    if (!SUPABASE_READY) {
      if (DISABLE_LOCAL_DB) return res.status(503).json({ error: 'Supabase not configured' });
      // 本地模式暫無設定，回傳預設
      return res.json([
        { product_name: '桃子', grades: ['A','B','C'] },
        { product_name: '柿子', grades: ['A','B'] },
        { product_name: '水梨', grades: ['A','B','C'] },
        { product_name: '蜜蘋果', grades: ['A','B','C'] }
      ]);
    }
    const data = await getSupabaseClient().getProductGrades();
    res.json(data || []);
  } catch (err) {
    console.error('GET /api/product-grades error', err);
    res.status(500).json({ error: '取得產品品級失敗', details: err.message });
  }
});

// 新增端點：新增或更新庫存（支持多位置）
app.post('/api/inventory-v2', async (req, res) => {
  if (!SUPABASE_READY) {
    return res.status(503).json({ error: DISABLE_LOCAL_DB ? 'Supabase not configured' : 'Supabase 未設定或連線失敗' });
  }
  try {
    const result = await getSupabaseClient().upsertInventoryItem(req.body);
    res.json(result);
  } catch (err) {
    console.error('POST /api/inventory-v2 error', err);
    res.status(500).json({ error: '新增或更新庫存失敗', details: err.message });
  }
});



// AI proxy
app.post('/api/ai', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const { context, prompt } = req.body || {};

  if (!apiKey) {
    return res.json({ text: 'API Key is missing on the server. Please configure GEMINI_API_KEY.' });
  }

  const withTimeout = (p, ms) => Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error('ai-timeout')), ms))
  ]);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const fullPrompt = `你是農業營運顧問，請以繁體中文回答並保持簡潔。Context: ${JSON.stringify(context ?? {})}\nUser Query: ${prompt}`;
    const started = Date.now();
    const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 10000);
    const result = await withTimeout(
      ai.models.generateContent({ model: 'gemini-2.5-flash', contents: fullPrompt }),
      timeoutMs
    );
    const text = (result && (result.text || result.response?.text?.())) || 'No response generated.';
    res.set('X-External-AI-ms', String(Date.now() - started));
    res.json({ text });
  } catch (error) {
    const reqId = res.getHeader('X-Request-Id');
    const errorMsg = error && error.message ? error.message : String(error);
    console.error('AI Error:', errorMsg, 'reqId=', reqId);
    
    // Check if API key is invalid or leaked
    if (errorMsg.includes('403') || errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('leaked')) {
      return res.status(403).json({
        text: 'Gemini API key is invalid or has been reported as leaked. Please update GEMINI_API_KEY in Vercel environment variables.',
        reqId
      });
    }
    
    const isTimeout = errorMsg.includes('ai-timeout');
    res.status(isTimeout ? 504 : 500).json({ 
      text: isTimeout ? 'AI request timeout' : 'AI service error',
      error: errorMsg,
      reqId 
    });
  }
});

// Dependencies health check
app.get('/api/health/deps', async (req, res) => {
  const reqId = res.getHeader('X-Request-Id');
  const env = {
    vercel: !!process.env.VERCEL,
    node: process.versions.node,
    region: process.env.VERCEL_REGION || null,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY),
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
  };

  let supabaseState = 'not-configured';
  let supabaseMs = 0;
  let supabaseError = null;
  try {
    if (SUPABASE_READY) {
      const t0 = Date.now();
      const timeoutMs = Number(process.env.SUPABASE_HEALTH_TIMEOUT_MS || 3000);
      try {
        const probe = getSupabaseClient().getOrders().catch(e => { throw e; });
        const res = await Promise.race([
          probe,
          new Promise((_, reject) => setTimeout(() => reject(new Error('supabase-health-timeout')), timeoutMs))
        ]);
        // if resolved without throwing
        supabaseState = 'ok';
      } catch (e) {
        supabaseState = String(e?.message || '').includes('timeout') ? 'timeout' : 'error';
        supabaseError = e.message || String(e);
      } finally {
        supabaseMs = Date.now() - t0;
      }
    }
  } catch (e) {
    supabaseState = 'error';
    supabaseError = e.message || String(e);
  }

  // AI reachability (network only), 2s budget
  let aiState = env.hasGeminiKey ? 'checking' : 'not-configured';
  let aiMs = 0;
  let aiError = null;
  if (env.hasGeminiKey) {
    const t0 = Date.now();
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 2000);
      // HEAD to Google API domain to verify egress
      await fetch('https://generativelanguage.googleapis.com/', { method: 'HEAD', signal: ac.signal }).catch(() => {});
      clearTimeout(tid);
      aiState = 'reachable';
    } catch (e) {
      aiState = 'error';
      aiError = e.message || String(e);
    } finally {
      aiMs = Date.now() - t0;
    }
  }

  res.json({
    status: 'ok',
    reqId,
    checks: {
      env,
      supabase: { state: supabaseState, ms: supabaseMs, error: supabaseError },
      ai: { state: aiState, ms: aiMs, error: aiError },
    },
  });
});

// Debug config (sanitized)
app.get('/api/debug/config', (req, res) => {
  res.json({
    vercel: !!process.env.VERCEL,
    node: process.versions.node,
    region: process.env.VERCEL_REGION || null,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.SUPABASE_URL ? '[set]' : '[missing]',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '[set]' : (process.env.SUPABASE_KEY ? '[set]' : '[missing]'),
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '[set]' : '[missing]'
    }
  });
});

// expose app for testing
module.exports = app;

// only start server when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    const sc = getSupabaseClient();
    if (sc && sc.supabase) {
      console.log('Supabase configured: using Supabase as primary DB');
    } else {
      console.log('Supabase not configured: using local lowdb (server/db.json)');
    }
  });
}
