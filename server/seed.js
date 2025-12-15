const { db, init, file } = require('./db');
const fs = require('fs');

async function initAndSeed() {
  await init();

  const plots = [
  { id: 'P-01', name: '山坡區 A', crop: '蜜桃', area: '0.5 Ha', status: 'Active', health: 92 },
  { id: 'P-02', name: '河畔區', crop: '雪梨', area: '0.8 Ha', status: 'Active', health: 85 },
  { id: 'P-03', name: '上層梯田', crop: '蜜蘋果', area: '0.4 Ha', status: 'Maintenance', health: 78 },
];

const logs = [
  { id: 'L-101', date: '2023-10-25', plotId: 'P-01', activity: 'Pruning', cropType: '蜜桃', notes: '冬季修剪準備', cost: 2500, worker: '明伯' },
  { id: 'L-102', date: '2023-10-26', plotId: 'P-02', activity: 'Fertilize', cropType: '雪梨', notes: '有機堆肥施用', cost: 4000, worker: '美姨' },
  { id: 'L-103', date: '2023-10-27', plotId: 'P-01', activity: 'Weeding', cropType: '蜜桃', notes: '人工除草', cost: 1500, worker: '臨時工' },
];

const inventory = [
  { id: 'INV-01', productName: '蜜桃', grade: 'A', quantity: 150, location: '冷藏庫 1', harvestDate: '2023-10-20' },
  { id: 'INV-02', productName: '蜜桃', grade: 'B', quantity: 300, location: '冷藏庫 1', harvestDate: '2023-10-20' },
  { id: 'INV-03', productName: '雪梨', grade: 'A', quantity: 500, location: '倉庫 A', harvestDate: '2023-10-15' },
  { id: 'INV-04', productName: '雪梨', grade: 'C', quantity: 120, location: '倉庫 B', harvestDate: '2023-10-15' },
];

const orders = [
  { id: 'ORD-2023-001', customerName: '王大明', channel: 'Line', items: JSON.stringify([{ productName: '蜜桃', grade: 'A', qty: 2, price: 1200 }]), total: 2400, status: 'Pending', date: '2023-10-27' },
  { id: 'ORD-2023-002', customerName: '台北市場', channel: 'Wholesale', items: JSON.stringify([{ productName: '雪梨', grade: 'B', qty: 50, price: 600 }]), total: 30000, status: 'Shipped', date: '2023-10-26' },
  { id: 'ORD-2023-003', customerName: '林小姐', channel: 'Phone', items: JSON.stringify([{ productName: '蜜桃', grade: 'A', qty: 1, price: 1200 }]), total: 1200, status: 'Completed', date: '2023-10-25' },
  { id: 'ORD-2023-004', customerName: '陳氏咖啡店', channel: 'Direct', items: JSON.stringify([{ productName: '雪梨', grade: 'C', qty: 10, price: 300 }]), total: 3000, status: 'Pending', date: '2023-10-27' },
];

const customers = [
  { id: 'C-001', name: '王大明', phone: '0912-345-678', segment: 'VIP', totalSpent: 25000, lastOrderDate: '2023-10-27' },
  { id: 'C-002', name: '林小姐', phone: '0922-111-222', segment: 'Stable', totalSpent: 8000, lastOrderDate: '2023-10-25' },
  { id: 'C-003', name: '台北市場', phone: '02-2222-3333', segment: 'VIP', totalSpent: 500000, lastOrderDate: '2023-10-26' },
  { id: 'C-004', name: '新客戶1', phone: '0933-444-555', segment: 'New', totalSpent: 1200, lastOrderDate: '2023-09-10' },
  { id: 'C-005', name: '流失客戶', phone: '0955-666-777', segment: 'At Risk', totalSpent: 5000, lastOrderDate: '2022-11-10' },
];

  // write to db
  const container = require('./db');
  container.data.plots = plots;
  container.data.logs = logs;
  container.data.inventory = inventory;
  container.data.orders = orders;
  container.data.customers = customers;
  await container.write();
  console.log('Seed complete', file);
  return true;
}

module.exports = initAndSeed;

if (require.main === module) {
  initAndSeed().catch(err => { console.error(err); process.exit(1); });
}
