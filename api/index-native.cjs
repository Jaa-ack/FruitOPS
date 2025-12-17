// Vercel API handler - Native approach without serverless-http
// This version creates a minimal HTTP server directly

const http = require('http');

module.exports = async (req, res) => {
  const started = Date.now();
  const reqId = req.headers['x-request-id'] || 'no-id';
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Health check - instant response
  if (req.url === '/' || req.url === '/api/healthz' || req.url === '/healthz') {
    res.setHeader('Content-Type', 'application/json');
    const response = JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        supabase: !!process.env.SUPABASE_URL,
        gemini: !!process.env.GEMINI_API_KEY,
        handler: 'native-http'
      }
    });
    return res.status(200).end(response);
  }
  
  console.log(`[NATIVE-HANDLER] ${reqId} ${req.method} ${req.url}`);
  
  try {
    // Dynamic import of Express app
    const app = require('../server/index');
    
    // Wrap Express request/response to work with Vercel
    // Create a mock response to capture output
    const mockRes = {
      status: null,
      headers: {},
      body: null,
      statusCode: 200,
      
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      
      setHeader: function(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
      
      getHeader: function(name) {
        return this.headers[name.toLowerCase()];
      },
      
      json: function(data) {
        this.body = JSON.stringify(data);
        this.headers['content-type'] = 'application/json';
        return this;
      },
      
      end: function(data) {
        this.body = data || this.body;
        return this;
      }
    };
    
    // Copy Vercel res methods to mockRes
    Object.setPrototypeOf(mockRes, res);
    
    // Simple direct call to Express - timeout protection
    let completed = false;
    const timeoutHandle = setTimeout(() => {
      if (!completed && !res.headersSent) {
        console.error(`[NATIVE-HANDLER] ${reqId} Timeout after 8s`);
        res.status(504).json({ error: 'Handler timeout', reqId });
      }
    }, 8000);
    
    // Create minimal request wrapper
    const mockReq = Object.create(req);
    
    // Direct invocation of Express
    await new Promise((resolve) => {
      app._router.handle(mockReq, mockRes, () => {
        // Route not found
        if (!res.headersSent) {
          res.status(404).json({ error: 'Not found' });
        }
        resolve();
      });
    });
    
    completed = true;
    clearTimeout(timeoutHandle);
    
    // Send response if not already sent
    if (!res.headersSent && mockRes.body) {
      Object.entries(mockRes.headers).forEach(([k, v]) => {
        res.setHeader(k, v);
      });
      res.status(mockRes.statusCode);
      res.end(mockRes.body);
    }
    
    console.log(`[NATIVE-HANDLER] ${reqId} Complete in ${Date.now() - started}ms`);
    
  } catch (error) {
    console.error(`[NATIVE-HANDLER] ${reqId} Error: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message,
        reqId,
        timestamp: new Date().toISOString()
      });
    }
  }
};
