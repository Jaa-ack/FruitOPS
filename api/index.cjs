// Minimal serverless API handler - health check responds immediately without loading Express
// This avoids initialization issues that could cause timeouts in Vercel

module.exports = async (req, res) => {
  const started = Date.now();
  try { res.setHeader('X-Api-Wrapper', 'vercel-cjs'); } catch (_) {}
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Health check - respond immediately without loading Express app
  // This ensures healthz works even if Express initialization has issues
  if (req.url === '/' || req.url === '/api/healthz' || req.url === '/healthz') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(JSON.stringify({
      status: 'ok',
      message: 'API is alive',
      environment: process.env.VERCEL ? 'vercel' : 'local',
      timestamp: new Date().toISOString(),
      env_check: {
        has_supabase_url: !!process.env.SUPABASE_URL,
        has_supabase_key: !!process.env.SUPABASE_SERVICE_KEY,
        has_gemini_key: !!process.env.GEMINI_API_KEY,
        disable_local_db: process.env.DISABLE_LOCAL_DB,
        supabase_url_prefix: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) : null
      }
    }));
    return;
  }
  
  // For other endpoints, lazily load the Express app
  console.log('[API] ' + req.method + ' ' + req.url + ' starting...');
  let handlerPromise = null;
  try {
    const serverless = require('serverless-http');
    const app = require('../server/index');
    const handler = serverless(app);
    
    // Call handler and ensure it returns a promise
    const result = handler(req, res);
    handlerPromise = Promise.resolve(result);
    
  } catch (err) {
    console.error('[API Init Error]', err.message);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // Apply timeout protection (9s for Vercel's 10s limit)
  const VERCEL_TIMEOUT = 9000;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), VERCEL_TIMEOUT);
  });
  
  return Promise.race([handlerPromise, timeoutPromise])
    .catch((err) => {
      console.error('[API Timeout]', req.url, err.message);
      try {
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'application/json');
          res.status(504).end(JSON.stringify({ error: 'timeout', durationMs: Date.now() - started }));
        }
      } catch (e) {
        console.error('[API Error]', e.message);
      }
    })
    .finally(() => {
      console.log('[API] ' + req.method + ' ' + req.url + ' → ' + res.statusCode + ' ' + (Date.now() - started) + 'ms');
    });
};
