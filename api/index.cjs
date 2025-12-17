// Vercel API handler - Minimal wrapper
// Express app handles all routing; Vercel provides req/res

const app = require('../server/index');

module.exports = (req, res) => {
  console.log(`[API] ${req.method} ${req.url}`);
  
  // Let Express handle the request directly
  // Vercel will keep the connection open until response is sent
  return app(req, res);
};
