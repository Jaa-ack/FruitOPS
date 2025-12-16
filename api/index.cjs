// Minimal serverless API handler - health check responds immediately without loading Express
// This avoids initialization issues that could cause timeouts in Vercel

module.exports = async (req, res) => {
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
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // For other endpoints, lazily load the Express app
  try {
    const serverless = require('serverless-http');
    const app = require('../server/index');
    const handler = serverless(app);
    return handler(req, res);
  } catch (err) {
    console.error('[API Error]', err.message);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).end(JSON.stringify({ 
      status: 'error', 
      message: 'Failed to initialize API'
    }));
  }
};
