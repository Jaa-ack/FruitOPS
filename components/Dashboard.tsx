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
  const safeInventory: InventoryItem[] = Array.isArray(inventory)
    ? inventory.map((i, idx) => ({
        id: (i as any).id || `inv-${idx}`,
        product_name: (i as any).product_name || i.productName || '未命名品項',
        productName: (i as any).product_name || i.productName || '未命名品項',
        grade: i.grade || 'N/A',
        quantity: Number(i.quantity) || 0,
        harvestDate: (i as any).harvest_date || i.harvestDate || '',
        harvest_date: (i as any).harvest_date || i.harvestDate || '',
        location: (i as any).location || '未指定',
        location_id: (i as any).location_id
      }))
    : [];
  
  // Calculate Metrics
  const revenue = orders.reduce((acc, curr) => acc + curr.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  const lowStockItems = safeInventory.filter(i => i.quantity < 50).length;
  
  const metrics: DashboardMetrics = {
    revenue,
    ordersPending: pendingOrders,
    lowStockItems,
    topCrop: '蜜桃' // Simplified for mock, translated to Chinese
  };

  // Chart Data Preparation
  const channelDisplay = (ch: string) => {
    switch(ch) {
      case 'Direct': return '直接銷售';
      case 'Line': return 'LINE';
      case 'Wholesale': return '批發';
      case 'Phone': return '電話';
      default: return ch;
    }
  };

  const channelData = [
    { name: channelDisplay('Direct'), value: orders.filter(o => o.channel === 'Direct').length },
    { name: channelDisplay('Line'), value: orders.filter(o => o.channel === 'Line').length },
    { name: channelDisplay('Wholesale'), value: orders.filter(o => o.channel === 'Wholesale').length },
    { name: channelDisplay('Phone'), value: orders.filter(o => o.channel === 'Phone').length },
  ];

  const inventoryData = safeInventory
    .filter(i => (i.productName || i.product_name) && i.quantity > 0) // 只顯示有效的庫存
    .map(i => ({
      name: `${i.productName || i.product_name || '未知商品'} (${i.grade || 'N/A'})`,
      數量: i.quantity
    }));

  // 庫存決策建議
  const totalInventory = safeInventory.reduce((sum, i) => sum + i.quantity, 0);
  const lowStockProducts = safeInventory.filter(i => i.quantity < 50);
  const highStockProducts = safeInventory.filter(i => i.quantity > 200);
  const avgStock = safeInventory.length > 0 ? Math.round(totalInventory / safeInventory.length) : 0;
  
  const inventoryInsights = [
    { 
      label: '總庫存量', 
      value: `${totalInventory} 單位`, 
      color: 'text-blue-600',
      advice: totalInventory < 500 ? '庫存偏低，建議規劃補貨' : '庫存充足'
    },
    { 
      label: '平均庫存', 
      value: `${avgStock} 單位/品項`, 
      color: 'text-green-600',
      advice: avgStock < 50 ? '平均庫存偏低' : '庫存分佈健康'
    },
    { 
      label: '低庫存商品', 
      value: `${lowStockProducts.length} 項`, 
      color: lowStockProducts.length > 0 ? 'text-orange-600' : 'text-gray-600',
      advice: lowStockProducts.length > 0 ? '需要優先補貨' : '無急迫缺貨風險'
    },
    { 
      label: '高庫存商品', 
      value: `${highStockProducts.length} 項`, 
      color: highStockProducts.length > 3 ? 'text-purple-600' : 'text-gray-600',
      advice: highStockProducts.length > 3 ? '考慮促銷降低庫存' : '庫存控制良好'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full mr-4">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">季總營收</p>
            <p className="text-2xl font-bold text-gray-800">NT$ {metrics.revenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full mr-4">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">待處理訂單</p>
            <p className="text-2xl font-bold text-gray-800">{metrics.ordersPending}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full mr-4">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">庫存預警</p>
            <p className="text-2xl font-bold text-gray-800">{metrics.lowStockItems}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full mr-4">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">主力作物</p>
            <p className="text-xl font-bold text-gray-800">{metrics.topCrop}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Channel Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">銷售通路分佈</h3>
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">當前庫存水位</h3>
          <div className="h-64">
            {inventoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
                無庫存資料可顯示
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="數量" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 庫存決策建議 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-blue-600" />
          庫存管理決策建議
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {inventoryInsights.map((insight, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm text-gray-600 font-medium">{insight.label}</p>
                <span className={`text-lg font-bold ${insight.color}`}>{insight.value}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
                💡 {insight.advice}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white p-4 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">智慧補貨建議</h4>
          <div className="space-y-1 text-xs text-gray-600">
            {lowStockProducts.length > 0 && (
              <p>• 優先補貨：{lowStockProducts.slice(0, 3).map(p => p.productName || p.product_name).join('、')}{lowStockProducts.length > 3 ? ` 等 ${lowStockProducts.length} 項` : ''}</p>
            )}
            {highStockProducts.length > 0 && (
              <p>• 庫存過高：{highStockProducts.slice(0, 3).map(p => p.productName || p.product_name).join('、')} 可考慮促銷</p>
            )}
            {lowStockProducts.length === 0 && highStockProducts.length === 0 && (
              <p className="text-green-600">✓ 當前庫存配置良好，無急迫調整需求</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;