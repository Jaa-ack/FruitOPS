// Vercel serverless API handler
// Strategy: Keep it simple, await handler completion, explicit error handling

module.exports = async (req, res) => {
  const started = Date.now();
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Api-Wrapper', 'vercel-cjs');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Health check - no Express load needed
  if (req.url === '/' || req.url === '/api/healthz' || req.url === '/healthz') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        supabase: !!process.env.SUPABASE_URL,
        gemini: !!process.env.GEMINI_API_KEY
      }
    }));
  }
  
  // For all other routes, load Express
  console.log(`[API] ${req.method} ${req.url}`);
  
  try {
    const serverless = require('serverless-http');
    const app = require('../server/index');
    
    // Create handler
    const handler = serverless(app, { 
      // Force async mode to ensure proper promise handling
      basePath: '' 
    });
    
    // Wrap in timeout: 8s max (Vercel limit is 10s)
    const result = await Promise.race([
      handler(req, res),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Handler timeout after 8s')), 8000)
      )
    ]);
    
    console.log(`[API] ${req.method} ${req.url} completed in ${Date.now() - started}ms`);
    return result;
    
  } catch (error) {
    console.error(`[API ERROR] ${error.message} at ${Date.now() - started}ms`);
    
    // Only send response if headers not yet sent
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      const status = error.message.includes('timeout') ? 504 : 500;
      return res.status(status).json({
        error: error.message,
        path: req.url,
        durationMs: Date.now() - started
      });
    }
    
    // If headers already sent, just log and exit
    console.error(`[API] Headers already sent when error occurred`);
    return;
  }
};
