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
    product_name: string; // from DB: product_name
    productName?: string; // for backward compatibility
    grade: 'A' | 'B' | 'C';
    quantity: number; // kg or box
    location?: string; // "Cold Storage 1" (from storage_locations.name)
    location_id?: string; // UUID FK to storage_locations
    harvestDate?: string;
    harvest_date?: string;
    packageSpec?: string;
    package_spec?: string;
    batchId?: string;
    batch_id?: string;
    originPlotId?: string;
    origin_plot_id?: string;
  }
  
  // Orders
  export interface Order {
    id: string;
    customerName?: string;
    customer_name?: string; // from backend JOIN
    channel: 'Line' | 'Google Form' | 'Phone' | 'Direct' | 'Wholesale';
    source?: 'GoogleForm' | 'LINE' | 'Phone' | 'Fax' | 'WalkIn' | 'Other';
    payment_status?: 'Unpaid' | 'Paid' | 'Refunded' | 'Partial';
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
    region?: string;
    preferredChannel?: 'Direct' | 'Line' | 'Phone' | 'Wholesale';
    segment: 'VIP' | 'Stable' | 'Regular' | 'New' | 'At Risk'; // RFM Segment
    totalSpent: number;
    lastOrderDate: string;
    rfmLocked?: boolean;
    rfmLockedReason?: string | null;
    rfmLockedAt?: string | null;
  }
  
  export interface DashboardMetrics {
    revenue: number;
    ordersPending: number;
    lowStockItems: number;
    topCrop: string;
  }