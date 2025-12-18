import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardMetrics, Order, InventoryItem } from '../types';
import { AlertTriangle, ClipboardCheck, PackageOpen, ShoppingBasket, TrendingUp, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductionCalendar from './ProductionCalendar';
import { getAvailableFruitsByMonth } from '../types/fruitCycle';

interface DashboardProps {
  orders: Order[];
  inventory: InventoryItem[];
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6'];

const Dashboard: React.FC<DashboardProps> = ({ orders, inventory }) => {
  const [showCalendar, setShowCalendar] = useState(false);

  // 取得當前月份
  const currentMonth = new Date().getMonth() + 1;
  const availableFruits = getAvailableFruitsByMonth(currentMonth);
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
  const topChannel = (() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.channel] = (counts[o.channel] || 0) + 1; });
    const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    return entries.length ? entries[0][0] : 'Direct';
  })();
  
  const metrics: DashboardMetrics = {
    revenue,
    ordersPending: pendingOrders,
    lowStockItems,
    topCrop: '蜜桃'
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
      {/* 季節狀況提示 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">📅 {currentMonth}月季節狀況</h3>
              <p className="text-sm text-amber-700">
                {availableFruits.length > 0
                  ? `可銷售水果：${availableFruits.map(f => f.cnName).join('、')}`
                  : '無新鮮水果在季，依靠冷藏庫存銷售'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-semibold"
          >
            {showCalendar ? '隱藏' : '查看'} 行事曆
          </button>
        </div>
      </div>

      {/* 展開的行事曆 */}
      {showCalendar && (
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-lg">
          <ProductionCalendar />
        </div>
      )}

      {/* 今日決策建議 */}
      <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-600" /> 今日決策建議
          </h3>
          <span className="text-xs text-gray-500">即時根據庫存與訂單生成</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 補貨建議 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-emerald-700">
              <ShoppingBasket size={18} />
              <span className="text-sm font-semibold">補貨建議</span>
            </div>
            <p className="text-sm text-gray-700">
              低庫存：<b>{lowStockItems}</b> 項
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {availableFruits.length > 0
                ? `當月在季水果優先補貨：${availableFruits.map(f => f.cnName).join('、')}`
                : '淡季依靠冷藏庫存，建議優先銷售臨期品'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              其他補貨：{safeInventory.filter(i=>i.quantity<50).slice(0,3).map(i=>i.productName||i.product_name).join('、') || '—'}
            </p>
            <div className="mt-3">
              <Link to="/inventory" className="text-xs text-emerald-700 hover:text-emerald-800 underline">前往分級庫存</Link>
            </div>
          </div>

          {/* 訂單優先處理 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-blue-700">
              <ClipboardCheck size={18} />
              <span className="text-sm font-semibold">訂單優先處理</span>
            </div>
            <p className="text-sm text-gray-700">
              待處理：<b>{pendingOrders}</b> 筆
            </p>
            <p className="text-xs text-gray-500 mt-1">
              建議先處理最近 24h 的新訂單，以降低等待時間。
            </p>
            <div className="mt-3">
              <Link to="/orders" className="text-xs text-blue-700 hover:text-blue-800 underline">前往訂單管理</Link>
            </div>
          </div>

          {/* 儲位調整 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-orange-700">
              <PackageOpen size={18} />
              <span className="text-sm font-semibold">儲位調整</span>
            </div>
            <p className="text-sm text-gray-700">
              高庫存：<b>{highStockProducts.length}</b> 項
            </p>
            <p className="text-xs text-gray-500 mt-1">
              建議移至冷藏或促銷降低庫存壓力。
            </p>
            <div className="mt-3">
              <Link to="/inventory" className="text-xs text-orange-700 hover:text-orange-800 underline">前往庫存管理</Link>
            </div>
          </div>

          {/* 銷售推進 */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-purple-700">
              <TrendingUp size={18} />
              <span className="text-sm font-semibold">銷售推進</span>
            </div>
            <p className="text-sm text-gray-700">
              近況：<b>{channelDisplay(topChannel)}</b> 通路表現最佳
            </p>
            <p className="text-xs text-gray-500 mt-1">
              建議在 {channelDisplay(topChannel)} 推出促銷組合以提升轉單率。
            </p>
            <div className="mt-3">
              <Link to="/orders" className="text-xs text-purple-700 hover:text-purple-800 underline">前往訂單管理</Link>
            </div>
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

      {/* （已移至分級庫存頁）庫存管理細節建議 */}
    </div>
  );
};

export default Dashboard;