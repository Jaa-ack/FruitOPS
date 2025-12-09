import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardMetrics, Order, InventoryItem } from '../types';
import { DollarSign, Package, AlertTriangle, TrendingUp } from 'lucide-react';

interface DashboardProps {
  orders: Order[];
  inventory: InventoryItem[];
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6'];

const Dashboard: React.FC<DashboardProps> = ({ orders, inventory }) => {
  
  // Calculate Metrics
  const revenue = orders.reduce((acc, curr) => acc + curr.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  const lowStockItems = inventory.filter(i => i.quantity < 50).length;
  
  const metrics: DashboardMetrics = {
    revenue,
    ordersPending: pendingOrders,
    lowStockItems,
    topCrop: 'Honey Peach' // Simplified for mock
  };

  // Chart Data Preparation
  const channelData = [
    { name: 'Direct', value: orders.filter(o => o.channel === 'Direct').length },
    { name: 'Line', value: orders.filter(o => o.channel === 'Line').length },
    { name: 'Wholesale', value: orders.filter(o => o.channel === 'Wholesale').length },
    { name: 'Phone', value: orders.filter(o => o.channel === 'Phone').length },
  ];

  const inventoryData = inventory.map(i => ({
    name: `${i.productName} (${i.grade})`,
    qty: i.quantity
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full mr-4">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">季總營收 (Total Revenue)</p>
            <p className="text-2xl font-bold text-gray-800">NT$ {metrics.revenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full mr-4">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">待處理訂單 (Pending)</p>
            <p className="text-2xl font-bold text-gray-800">{metrics.ordersPending}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full mr-4">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">庫存預警 (Low Stock)</p>
            <p className="text-2xl font-bold text-gray-800">{metrics.lowStockItems}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full mr-4">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">主力作物 (Top Crop)</p>
            <p className="text-xl font-bold text-gray-800">{metrics.topCrop}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Channel Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">銷售通路分佈 (Sales Channels)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Levels */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">當前庫存水位 (Current Inventory)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="qty" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;