// Only load .env automatically in non-test environments. Tests set NODE_ENV=test
// so they can control process.env without dotenv overriding values from server/.env
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}
const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const dbContainer = require('./db');
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
  keyGenerator: (req) =>
    req.ip ||
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    'unknown',
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
  try {
    if (supabaseClient.supabase) {
      const rows = await supabaseClient.getPlots();
      return res.json(rows || []);
    }
    await dbContainer.init();
    res.json(dbContainer.data.plots || []);
  } catch (err) {
    console.error('GET /api/plots error', err);
    res.status(500).json([]);
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    if (supabaseClient.supabase) {
      const rows = await supabaseClient.getLogs();
      return res.json(rows || []);
    }
    await dbContainer.init();
    const rows = (dbContainer.data.logs || []).sort((a,b) => b.date.localeCompare(a.date));
    res.json(rows);
  } catch (err) {
    console.error('GET /api/logs error', err);
    res.status(500).json([]);
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
      if (supabaseClient.supabase) {
        await supabaseClient.addLog({ id, date, plotId, activity, cropType, notes, cost, worker });
        return res.status(201).json({ ok: true });
      }
        await dbContainer.init();
        dbContainer.data.logs = dbContainer.data.logs || [];
        dbContainer.data.logs.push({ id, date, plotId, activity, cropType, notes, cost, worker });
        await dbContainer.write();
      res.status(201).json({ ok: true });
    } catch (err) {
      console.error('POST /api/logs error', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

app.get('/api/inventory', async (req, res) => {
  try {
    if (supabaseClient.supabase) {
      const rows = await supabaseClient.getInventory();
      return res.json(rows || []);
    }
    await dbContainer.init();
    res.json(dbContainer.data.inventory || []);
  } catch (err) {
    console.error('GET /api/inventory error', err);
    res.status(500).json([]);
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    if (supabaseClient.supabase) {
      const rows = await supabaseClient.getOrders();
      const mapped = (rows || []).map(r => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items }));
      return res.json(mapped);
    }
    await dbContainer.init();
    const rows = (dbContainer.data.orders || []).map(r => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items }));
    res.json(rows);
  } catch (err) {
    console.error('GET /api/orders error', err);
    res.status(500).json([]);
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    if (supabaseClient.supabase) {
      const rows = await supabaseClient.getCustomers();
      return res.json(rows || []);
    }
    await dbContainer.init();
    res.json(dbContainer.data.customers || []);
  } catch (err) {
    console.error('GET /api/customers error', err);
    res.status(500).json([]);
  }
});

// health check
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', db: supabaseClient.supabase ? 'supabase' : 'local' });
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
