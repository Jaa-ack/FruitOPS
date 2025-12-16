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
      // Diagnostic info (without exposing full keys)
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
  
  // For other endpoints, lazily load the Express app with timeout protection
  try {
    const serverless = require('serverless-http');
    const app = require('../server/index');
    const handler = serverless(app);
    
    // Vercel has 10s timeout for hobby tier, protect against hanging requests
    const VERCEL_TIMEOUT = 9000; // 9s safety margin
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Function timeout protection triggered')), VERCEL_TIMEOUT);
    });
    
    const handlerPromise = handler(req, res);
    
    // Race between handler and timeout
    const p = Promise.race([handlerPromise, timeoutPromise])
      .catch((err) => {
        if (!res.headersSent) {
          console.error('[API Timeout]', req.url, err.message);
          res.setHeader('Content-Type', 'application/json');
          res.status(504).end(JSON.stringify({
            error: 'Gateway Timeout',
            message: 'Request took too long to process',
            hint: 'Check Supabase connection and DISABLE_LOCAL_DB env var'
          }));
        }
        throw err;
      });
    
    // ensure duration logged when promise settles
    Promise.resolve(p).finally(() => {
      try { res.setHeader('X-Handler-Duration-ms', String(Date.now() - started)); } catch (_) {}
      console.log(`[API] ${req.method} ${req.url} → ${res.statusCode} ${Date.now() - started}ms`);
    });
    
    return p;
  } catch (err) {
    console.error('[API Error]', err.message, err.stack);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).end(JSON.stringify({ 
        status: 'error', 
        message: 'Failed to initialize API',
        details: err.message
      }));
    }
  }
};
