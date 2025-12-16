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

// Lazy load supabaseClient to avoid blocking in serverless
let supabaseClient = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = require('./supabase');
  }
  return supabaseClient;
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;

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
  console.log(`[DEBUG] ${req.method} ${req.path}`);
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
  try {
    if (!getSupabaseClient().supabase) {
      const db = await ensureLocalDB();
      return res.json(db.data.plots || []);
    }
    const rows = await getSupabaseClient().getPlots();
    res.json(rows || []);
  } catch (err) {
    console.error('GET /api/plots error', err);
    res.status(500).json({ error: '取得 plots 失敗', details: err.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    if (!getSupabaseClient().supabase) {
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
      if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
  const { customerName, channel, items, total, status } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: '訂單必須包含至少一項商品' });
  }
  
  try {
    const orderId = `ORD-${Date.now()}`;
    const orderData = {
      id: orderId,
      customer_name: customerName || '未命名客戶',
      channel: channel || 'Direct',
      total: Number(total) || 0,
      status: status || 'Pending',
      order_items: items.map(item => ({
        product_name: item.productName,
        grade: item.grade || 'A',
        quantity: Number(item.qty) || 0,
        price: Number(item.price) || 0
      }))
    };

    if (!getSupabaseClient().supabase) {
      const db = await ensureLocalDB();
      db.data.orders = db.data.orders || [];
      db.data.orders.unshift({
        id: orderId,
        customerName: orderData.customer_name,
        channel: orderData.channel,
        items: JSON.stringify(items),
        total: orderData.total,
        status: orderData.status,
        date: new Date().toISOString().slice(0,10)
      });
      await db.write();
      return res.status(201).json({ ok: true, orderId });
    }

    await getSupabaseClient().addOrder(orderData);
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
    if (!getSupabaseClient().supabase) {
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

    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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

// 新增端點：獲取庫存摘要（按產品）
app.get('/api/inventory-summary', async (req, res) => {
  try {
    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
    if (!getSupabaseClient().supabase) {
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
  if (!getSupabaseClient().supabase) {
    return res.status(503).json({ error: 'Supabase 未設定或連線失敗' });
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

  try {
    const ai = new GoogleGenAI({ apiKey });
    const fullPrompt = `你是農業營運顧問，請以繁體中文回答並保持簡潔。Context: ${context}\nUser Query: ${prompt}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: fullPrompt });
    res.json({ text: response.text || 'No response generated.' });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ text: 'AI service error' });
  }
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
