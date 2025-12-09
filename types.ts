// Production
export interface FarmLog {
    id: string;
    date: string;
    plotId: string;
    activity: 'Fertilize' | 'Pesticide' | 'Weeding' | 'Pruning' | 'Harvest' | 'Bagging';
    cropType: string;
    notes: string;
    cost: number;
    worker: string;
  }
  
  export interface Plot {
    id: string;
    name: string;
    crop: string;
    area: string; // e.g., "0.5 Hectare"
    status: 'Active' | 'Fallow' | 'Maintenance';
    health: number; // 0-100
  }
  
  // Inventory
  export interface InventoryItem {
    id: string;
    productName: string; // e.g., "Honey Peach"
    grade: 'A' | 'B' | 'C';
    quantity: number; // kg or box
    location: string; // "Cold Storage 1"
    harvestDate: string;
  }
  
  // Orders
  export interface Order {
    id: string;
    customerName: string;
    channel: 'Line' | 'Google Form' | 'Phone' | 'Direct' | 'Wholesale';
    items: { productName: string; grade: string; qty: number; price: number }[];
    total: number;
    status: 'Pending' | 'Confirmed' | 'Shipped' | 'Completed' | 'Cancelled';
    date: string;
  }
  
  // CRM
  export interface Customer {
    id: string;
    name: string;
    phone: string;
    segment: 'VIP' | 'Stable' | 'New' | 'At Risk'; // RFM Segment
    totalSpent: number;
    lastOrderDate: string;
  }
  
  export interface DashboardMetrics {
    revenue: number;
    ordersPending: number;
    lowStockItems: number;
    topCrop: string;
  }