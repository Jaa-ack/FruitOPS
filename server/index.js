// Only load .env automatically in non-test environments. Tests set NODE_ENV=test
// so they can control process.env without dotenv overriding values from server/.env
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}
const express = require('express');
const bodyParser = require('body-parser');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const supabaseClient = require('./supabase');
const { GoogleGenAI } = require('@google/genai');

// initialize lowdb container when necessary (kept lazy safe)
// call dbContainer.init() where needed

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());

// Rate limiter (simple protective defaults)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // limit each IP to 120 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const xff = req.headers['x-forwarded-for'];
    const candidate =
      req.ip ||
      (Array.isArray(xff) ? xff[0] : xff?.split(',')[0]) ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      '0.0.0.0';
    return ipKeyGenerator(candidate.trim());
  },
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

app.get('/api/plots', async (req, res) => {
  if (!supabaseClient.supabase) {
    return res.status(503).json({ error: 'Supabase 未設定或連線失敗' });
  }
  try {
    const rows = await supabaseClient.getPlots();
    res.json(rows || []);
  } catch (err) {
    console.error('GET /api/plots error', err);
    res.status(500).json({ error: '取得 plots 失敗', details: err.message });
  }
});

app.get('/api/logs', async (req, res) => {
  if (!supabaseClient.supabase) {
    return res.status(503).json({ error: 'Supabase 未設定或連線失敗' });
  }
  try {
    const rows = await supabaseClient.getLogs();
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
    if (!supabaseClient.supabase) {
      return res.status(503).json({ ok: false, error: 'Supabase 未設定或連線失敗' });
    }
    try {
      await supabaseClient.addLog({ id, date, plotId, activity, cropType, notes, cost, worker });
      res.status(201).json({ ok: true });
    } catch (err) {
      console.error('POST /api/logs error', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

app.get('/api/inventory', async (req, res) => {
  if (!supabaseClient.supabase) {
    return res.status(503).json({ error: 'Supabase 未設定或連線失敗' });
  }
  try {
    const rows = await supabaseClient.getInventory();
    res.json(rows || []);
  } catch (err) {
    console.error('GET /api/inventory error', err);
    res.status(500).json({ error: '取得 inventory 失敗', details: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  if (!supabaseClient.supabase) {
    return res.status(503).json({ error: 'Supabase 未設定或連線失敗' });
  }
  try {
    const rows = await supabaseClient.getOrders();
    const mapped = (rows || []).map(r => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items }));
    res.json(mapped);
  } catch (err) {
    console.error('GET /api/orders error', err);
    res.status(500).json({ error: '取得 orders 失敗', details: err.message });
  }
});

app.get('/api/customers', async (req, res) => {
  if (!supabaseClient.supabase) {
    return res.status(503).json({ error: 'Supabase 未設定或連線失敗' });
  }
  try {
    const rows = await supabaseClient.getCustomers();
    res.json(rows || []);
  } catch (err) {
    console.error('GET /api/customers error', err);
    res.status(500).json({ error: '取得 customers 失敗', details: err.message });
  }
});

// health check
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', db: supabaseClient.supabase ? 'supabase' : 'unconfigured' });
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
    const fullPrompt = `You are an expert agricultural operations consultant. Context: ${context}\nUser Query: ${prompt}`;
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
    if (supabaseClient.supabase) {
      console.log('Supabase configured: using Supabase as primary DB');
    } else {
      console.log('Supabase not configured: using local lowdb (server/db.json)');
    }
  });
}
