const serverless = require('serverless-http');
const app = require('../server/index');

// Serverless wrapper with explicit timeout handling
const handler = serverless(app);

module.exports = handler;
