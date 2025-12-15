// Quick smoke test that prints /api endpoints
const base = process.env.BASE_URL || 'http://localhost:4000';

async function run() {
  for (const path of ['/api/plots', '/api/logs', '/api/inventory', '/api/orders', '/api/customers']) {
    try {
      const r = await fetch(base + path);
      const json = await r.json();
      console.log(path, 'OK', Array.isArray(json) ? json.length : typeof json);
    } catch (err) {
      console.error(path, 'ERROR', err.message);
    }
  }
}

run().catch(e => { console.error(e); process.exit(1); });
