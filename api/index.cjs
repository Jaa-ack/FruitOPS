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
    const response = JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        supabase: !!process.env.SUPABASE_URL,
        gemini: !!process.env.GEMINI_API_KEY
      }
    });
    res.setHeader('Content-Length', Buffer.byteLength(response));
    return res.status(200).end(response);
  }
  
  // For all other routes, load Express
  console.log(`[HANDLER] ${req.method} ${req.url} START`);
  
  try {
    const serverless = require('serverless-http');
    const app = require('../server/index');
    
    // Create handler with explicit basePath
    const handler = serverless(app, { 
      basePath: ''
    });
    
    // Simple await - no Promise.race complexity
    // serverless-http returns a Promise that resolves when response is sent
    console.log(`[HANDLER] Loading Express app and calling handler...`);
    await handler(req, res);
    console.log(`[HANDLER] ${req.method} ${req.url} DONE in ${Date.now() - started}ms`);
    
    // Response already sent by handler, don't return anything
    return;
    
  } catch (error) {
    console.error(`[HANDLER ERROR] ${error.message} at ${Date.now() - started}ms`, error.stack);
    
    // Only send response if headers not yet sent
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      const status = error.message.includes('timeout') ? 504 : 500;
      const response = JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      });
      res.setHeader('Content-Length', Buffer.byteLength(response));
      return res.status(status).end(response);
    }
  }
};
