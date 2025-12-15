const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'db.json');
let data = null;

async function init() {
  try {
    if (!fs.existsSync(file)) {
      data = { plots: [], logs: [], inventory: [], orders: [], customers: [] };
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    } else {
      const raw = fs.readFileSync(file, 'utf-8');
      data = JSON.parse(raw || '{}');
      data.plots = data.plots || [];
      data.logs = data.logs || [];
      data.inventory = data.inventory || [];
      data.orders = data.orders || [];
      data.customers = data.customers || [];
    }
  } catch (err) {
    console.error('DB init error', err);
    throw err;
  }
}

async function write() {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { init, write, get data() { return data; }, set data(val) { data = val; }, file };
