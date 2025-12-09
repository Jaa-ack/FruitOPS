import { Customer, FarmLog, InventoryItem, Order, Plot } from './types';

export const MOCK_PLOTS: Plot[] = [
  { id: 'P-01', name: 'Hillside Block A', crop: 'Honey Peach', area: '0.5 Ha', status: 'Active', health: 92 },
  { id: 'P-02', name: 'Riverside Block', crop: 'Snow Pear', area: '0.8 Ha', status: 'Active', health: 85 },
  { id: 'P-03', name: 'Upper Terrace', crop: 'Honey Apple', area: '0.4 Ha', status: 'Maintenance', health: 78 },
];

export const MOCK_LOGS: FarmLog[] = [
  { id: 'L-101', date: '2023-10-25', plotId: 'P-01', activity: 'Pruning', cropType: 'Honey Peach', notes: 'Winter pruning preparation', cost: 2500, worker: 'Uncle Ming' },
  { id: 'L-102', date: '2023-10-26', plotId: 'P-02', activity: 'Fertilize', cropType: 'Snow Pear', notes: 'Organic compost application', cost: 4000, worker: 'Auntie Mei' },
  { id: 'L-103', date: '2023-10-27', plotId: 'P-01', activity: 'Weeding', cropType: 'Honey Peach', notes: 'Manual weeding', cost: 1500, worker: 'External Hire' },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'INV-01', productName: 'Honey Peach', grade: 'A', quantity: 150, location: 'Cold Store 1', harvestDate: '2023-10-20' },
  { id: 'INV-02', productName: 'Honey Peach', grade: 'B', quantity: 300, location: 'Cold Store 1', harvestDate: '2023-10-20' },
  { id: 'INV-03', productName: 'Snow Pear', grade: 'A', quantity: 500, location: 'Warehouse A', harvestDate: '2023-10-15' },
  { id: 'INV-04', productName: 'Snow Pear', grade: 'C', quantity: 120, location: 'Warehouse B', harvestDate: '2023-10-15' },
];

export const MOCK_ORDERS: Order[] = [
  { id: 'ORD-2023-001', customerName: 'Wang Da-ming', channel: 'Line', items: [{ productName: 'Honey Peach', grade: 'A', qty: 2, price: 1200 }], total: 2400, status: 'Pending', date: '2023-10-27' },
  { id: 'ORD-2023-002', customerName: 'Taipei Market', channel: 'Wholesale', items: [{ productName: 'Snow Pear', grade: 'B', qty: 50, price: 600 }], total: 30000, status: 'Shipped', date: '2023-10-26' },
  { id: 'ORD-2023-003', customerName: 'Ms. Lin', channel: 'Phone', items: [{ productName: 'Honey Peach', grade: 'A', qty: 1, price: 1200 }], total: 1200, status: 'Completed', date: '2023-10-25' },
  { id: 'ORD-2023-004', customerName: 'Chen Coffee Shop', channel: 'Direct', items: [{ productName: 'Snow Pear', grade: 'C', qty: 10, price: 300 }], total: 3000, status: 'Pending', date: '2023-10-27' },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'C-001', name: 'Wang Da-ming', phone: '0912-345-678', segment: 'VIP', totalSpent: 25000, lastOrderDate: '2023-10-27' },
  { id: 'C-002', name: 'Ms. Lin', phone: '0922-111-222', segment: 'Stable', totalSpent: 8000, lastOrderDate: '2023-10-25' },
  { id: 'C-003', name: 'Taipei Market', phone: '02-2222-3333', segment: 'VIP', totalSpent: 500000, lastOrderDate: '2023-10-26' },
  { id: 'C-004', name: 'New User 1', phone: '0933-444-555', segment: 'New', totalSpent: 1200, lastOrderDate: '2023-09-10' },
  { id: 'C-005', name: 'Lost User', phone: '0955-666-777', segment: 'At Risk', totalSpent: 5000, lastOrderDate: '2022-11-10' },
];