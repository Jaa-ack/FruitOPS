require('dotenv').config();
const { addLog } = require('./supabase');

async function run() {
  try {
    const log = { id: 'T-API-ADD-1', date: '2025-12-15', plotId: 'P-01', activity: 'test', cropType: '蜜桃', notes: 'from test_addlog', cost: 0, worker: 'me' };
    const res = await addLog(log);
    console.log('addLog result:', res);
  } catch (err) {
    console.error('addLog error:', err);
    process.exit(1);
  }
}

run();
