import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Order, InventoryItem, Customer } from '../types';
import { AlertTriangle, PackageOpen, TrendingUp, Calendar, Crown } from 'lucide-react';
import ProductionCalendar from './ProductionCalendar';
import { getAvailableFruitsByMonth } from '../types/fruitCycle';

interface DashboardProps {
  orders: Order[];
  inventory: InventoryItem[];
  customers?: Customer[];
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6'];

const Dashboard: React.FC<DashboardProps> = ({ orders, inventory, customers = [] }) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const availableFruits = getAvailableFruitsByMonth(currentMonth);
  const parseDate = (value?: string) => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

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

  const monthlyOrders = orders.filter(o => {
    const d = parseDate(o.date as any);
    return d && d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear && o.status === 'Completed';
  });

  const monthlySalesByProduct: Record<string, number> = {};
  monthlyOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.productName || '未知品項';
      monthlySalesByProduct[key] = (monthlySalesByProduct[key] || 0) + Number(item.qty || 0);
    });
  });

  const monthlyHarvestByProduct: Record<string, number> = {};
  safeInventory.forEach(i => {
    const d = parseDate((i as any).harvest_date || i.harvestDate);
    if (d && d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) {
      const key = i.productName || i.product_name || '未知品項';
      monthlyHarvestByProduct[key] = (monthlyHarvestByProduct[key] || 0) + Number(i.quantity || 0);
    }
  });

  const monthlyProductionSales = Array.from(
    new Set([...Object.keys(monthlyHarvestByProduct), ...Object.keys(monthlySalesByProduct)])
  ).map(name => ({
    name,
    harvested: monthlyHarvestByProduct[name] || 0,
    sold: monthlySalesByProduct[name] || 0,
  }));

  const monthlyHarvestTotal = monthlyProductionSales.reduce((sum, p) => sum + p.harvested, 0);
  const monthlySoldTotal = monthlyProductionSales.reduce((sum, p) => sum + p.sold, 0);
  const monthlyRevenue = monthlyOrders.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;

  const expiringInventory = safeInventory
    .map(i => {
      const d = parseDate((i as any).harvest_date || i.harvestDate);
      if (!d) return null;
      const agingDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...i,
        agingDays,
        displayName: `${i.productName || i.product_name || '未知品項'} (${i.grade || 'N/A'})`,
        harvest: d
      };
    })
    .filter(Boolean)
    .filter((i: any) => i.agingDays >= 10 && i.quantity > 0)
    .sort((a: any, b: any) => b.agingDays - a.agingDays)
    .slice(0, 6);

  const vipHighlights = customers
    .filter(c => c.segment === 'VIP')
    .map(c => {
      const d = parseDate((c as any).lastOrderDate || (c as any).last_order_date);
      const daysSince = d ? Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)) : null;
      return { ...c, lastOrderDateParsed: d, daysSince };
    })
    .sort((a, b) => {
      if (a.lastOrderDateParsed && b.lastOrderDateParsed) {
        return b.lastOrderDateParsed.getTime() - a.lastOrderDateParsed.getTime();
      }
      return (b.totalSpent || 0) - (a.totalSpent || 0);
    })
    .slice(0, 5);

  const vipCount = customers.filter(c => c.segment === 'VIP').length;

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
    .filter(i => (i.productName || i.product_name) && i.quantity > 0)
    .map(i => ({
      name: `${i.productName || i.product_name || '未知商品'} (${i.grade || 'N/A'})`,
      數量: i.quantity
    }));

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

      {/* 關鍵指標卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500">本月銷售額</p>
            <p className="text-lg font-semibold text-gray-800">${monthlyRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-400">訂單 {monthlyOrders.length} 筆</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <PackageOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500">本月產出 / 銷售量</p>
            <p className="text-lg font-semibold text-gray-800">{monthlyHarvestTotal} / {monthlyOrders.length}</p>
            <p className="text-xs text-gray-400">產量(件) / 完成訂單數</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500">即將過期庫存</p>
            <p className="text-lg font-semibold text-gray-800">{expiringInventory.length} 項</p>
            <p className="text-xs text-gray-400">≥10 天未銷售</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500">VIP 客戶</p>
            <p className="text-lg font-semibold text-gray-800">{vipCount} 位</p>
            <p className="text-xs text-gray-400">待處理訂單 {pendingOrders} 筆</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 本月水果產銷狀況 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">本月水果產銷狀況</h3>
              <p className="text-sm text-gray-500">{currentMonth} 月收成 / 銷售量（依品項彙總）</p>
            </div>
            <div className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              收成 {monthlyHarvestTotal} · 銷售 {monthlySoldTotal}
            </div>
          </div>
          {monthlyProductionSales.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              目前尚無本月產銷資料
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4">品項</th>
                    <th className="py-2 pr-4">收成量</th>
                    <th className="py-2 pr-4">銷售量</th>
                    <th className="py-2">差額</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {monthlyProductionSales.map((row) => {
                    const delta = (row.harvested || 0) - (row.sold || 0);
                    return (
                      <tr key={row.name}>
                        <td className="py-2 pr-4 font-medium text-gray-800">{row.name}</td>
                        <td className="py-2 pr-4 text-gray-700">{row.harvested}</td>
                        <td className="py-2 pr-4 text-gray-700">{row.sold}</td>
                        <td className={`py-2 text-sm ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {delta >= 0 ? `+${delta} 留存` : `${delta} 需補貨`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 即將過期庫存警告 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">即將過期庫存警告</h3>
              <p className="text-sm text-gray-500">依採收日期與庫存天數排序（≥10 天）</p>
            </div>
            <div className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              {expiringInventory.length} 項
            </div>
          </div>
          {expiringInventory.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              暫無即將過期庫存
            </div>
          ) : (
            <div className="space-y-3">
              {expiringInventory.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/60">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">{item.displayName}</p>
                    <p className="text-xs text-amber-700">庫存 {item.quantity} · 已存放 {item.agingDays} 天 · 位置 {item.location || '未指定'}</p>
                  </div>
                  <div className="text-xs px-3 py-1 rounded-full bg-amber-600 text-white">優先清倉</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIP 客戶動態 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">VIP 客戶動態</h3>
              <p className="text-sm text-gray-500">最近訂單與總消費（前 5 位）</p>
            </div>
            <div className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{vipCount} 位</div>
          </div>
          {vipHighlights.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              暫無 VIP 客戶資料
            </div>
          ) : (
            <div className="space-y-3">
              {vipHighlights.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-purple-100 bg-purple-50/60">
                  <div>
                    <p className="text-sm font-semibold text-purple-900">{c.name}</p>
                    <p className="text-xs text-purple-700">總消費 ${Number(c.totalSpent || 0).toLocaleString()} · {c.daysSince != null ? `最近 ${c.daysSince} 天前` : '未有訂單記錄'}</p>
                  </div>
                  <div className="text-xs px-3 py-1 rounded-full bg-white text-purple-700 border border-purple-200">VIP</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 銷售通路分佈 */}
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
      </div>

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
  );
};

export default Dashboard;
