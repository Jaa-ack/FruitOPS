import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Customer } from '../types';
import { User, Award, Clock, Star, Search } from 'lucide-react';

interface CRMProps {
  customers: Customer[];
}

const CRM: React.FC<CRMProps> = ({ customers }) => {
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  
  // 從 URL 參數獲取客戶名稱（來自訂單跳轉）
  const highlightedCustomer = useMemo(() => {
    return searchParams.get('customer') || '';
  }, [searchParams]);
  
  const safeCustomers: Customer[] = Array.isArray(customers)
    ? customers.map((c, idx) => ({
        ...c,
        id: c.id || `cust-${idx}`,
        name: c.name || '未命名客戶',
        phone: c.phone || '未提供電話',
        segment: c.segment || 'Stable',
        totalSpent: Number(c.totalSpent) || 0,
        lastOrderDate: c.lastOrderDate || '未紀錄'
      }))
    : [];

  // 取得訂單清單，用於彙整顧客消費紀錄
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to fetch orders for CRM:', e);
      }
    };
    fetchOrders();
  }, []);

  // 依顧客名稱彙整：總消費、最後下單日、訂單數、訂單列表
  const statsByCustomer = useMemo(() => {
    const map: Record<string, { total: number; lastDate: string; count: number; orders: any[] }> = {};
    const norm = Array.isArray(orders) ? orders : [];
    for (const o of norm) {
      const name = (o as any).customerName || (o as any).customer_name || '未命名客戶';
      const total = Number((o as any).total) || 0;
      const date = (o as any).date || (o as any).createdAt || '';
      if (!map[name]) map[name] = { total: 0, lastDate: '', count: 0, orders: [] };
      map[name].total += total;
      map[name].count += 1;
      map[name].orders.push(o);
      if (!map[name].lastDate || (date && date > map[name].lastDate)) {
        map[name].lastDate = date;
      }
    }
    return map;
  }, [orders]);
  
  // 篩選客戶
  const filteredCustomers = useMemo(() => {
    return safeCustomers.filter(c => 
      c.name.toLowerCase().includes((searchTerm || highlightedCustomer).toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [safeCustomers, searchTerm, highlightedCustomer]);
  
  const getSegmentStyle = (segment: string) => {
    switch(segment) {
                case 'VIP': return 'bg-purple-100 text-purple-700 border-purple-200';
                case 'Stable': return 'bg-blue-100 text-blue-700 border-blue-200';
                case 'New': return 'bg-green-100 text-green-700 border-green-200';
                case 'At Risk': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-700';
    }
  };

    const mapSegmentName = (segment: string) => {
        switch(segment) {
            case 'VIP': return '貴賓';
            case 'Stable': return '穩定客群';
            case 'New': return '新客';
            case 'At Risk': return '流失風險';
            default: return segment;
        }
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">顧客關係管理 (CRM)</h2>
        {highlightedCustomer && (
          <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            已搜尋: {highlightedCustomer}
          </span>
        )}
      </div>
      
      {/* 搜尋欄 */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="搜尋客戶名稱或電話..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
        />
      </div>
      
      {!filteredCustomers || filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <User size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">暫無客戶資料</p>
          <p className="text-sm">客戶數據將在此顯示</p>
        </div>
      ) : (
        <>
      {/* RFM Explanation Card */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-4">
          <div className="p-2 bg-indigo-200 rounded-lg text-indigo-700 mt-1">
              <Star size={20} />
          </div>
          <div>
              <h3 className="font-bold text-indigo-900">RFM 智慧分群</h3>
              <p className="text-indigo-700 text-sm mt-1">
                系統根據 <strong>最近購買日 (Recency)</strong>、<strong>購買頻率 (Frequency)</strong> 與 <strong>消費金額 (Monetary)</strong> 自動將客戶分群。
                建議優先挽回 "At Risk" 客戶，並提供 "VIP" 客戶專屬預購連結。
              </p>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => {
          const isHighlighted = customer.name === highlightedCustomer;
          const stats = statsByCustomer[customer.name] || { total: customer.totalSpent || 0, lastDate: customer.lastOrderDate || '未紀錄', count: 0, orders: [] };
          return (
            <div 
              key={customer.id} 
              className={`bg-white p-5 rounded-xl shadow-sm border flex flex-col justify-between transition-all ${
                isHighlighted 
                  ? 'border-2 border-amber-400 shadow-md ring-2 ring-amber-100' 
                  : 'border-gray-200'
              }`}
            >
                <div>
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                <User size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">{customer.name}</h4>
                                <p className="text-xs text-gray-400 font-mono">{customer.phone}</p>
                            </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getSegmentStyle(customer.segment)}`}>
                            {mapSegmentName(customer.segment)}
                        </span>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 flex items-center gap-1"><Award size={14}/> 累積消費</span>
                        <span className="font-medium text-gray-800">NT$ {Number(stats.total || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 flex items-center gap-1"><Clock size={14}/> 上次購買</span>
                        <span className="font-medium text-gray-800">{stats.lastDate || '未紀錄'}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="w-full py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        查看完整檔案
                    </button>
                </div>
            </div>
          );
        })}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-gray-500">客戶檔案</p>
                <h3 className="text-xl font-bold text-gray-800">{selectedCustomer.name}</h3>
                <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getSegmentStyle(selectedCustomer.segment)}`}>
                {mapSegmentName(selectedCustomer.segment)}
              </span>
            </div>
            {(() => {
              const stats = statsByCustomer[selectedCustomer.name] || { total: 0, lastDate: '未紀錄', count: 0, orders: [] as any[] };
              return (
                <>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>累積消費：NT$ {Number(stats.total || 0).toLocaleString()}</p>
                    <p>上次購買：{stats.lastDate || '未紀錄'}</p>
                    <p>訂單數量：{stats.count}</p>
                    <p>建議行動：{selectedCustomer.segment === 'At Risk' ? '聯繫挽回，提供回購優惠。' : selectedCustomer.segment === 'VIP' ? '推送預購與專屬組合。' : '保持互動，提升回購頻率。'}</p>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">近期消費紀錄</h4>
                    {stats.orders && stats.orders.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-md">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-600">
                            <tr>
                              <th className="p-2">日期</th>
                              <th className="p-2">內容</th>
                              <th className="p-2 text-right">金額</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {stats.orders.map((o: any) => (
                              <tr key={o.id}>
                                <td className="p-2 text-gray-600">{o.date || o.createdAt || '-'}</td>
                                <td className="p-2 text-gray-700">
                                  {(Array.isArray(o.items) ? o.items : []).map((it: any, i: number) => (
                                    <div key={i} className="text-xs">
                                      {(it.productName || it.product_name || '')} {(it.grade ? `(${it.grade})` : '')} x {(it.qty || it.quantity || 0)}
                                    </div>
                                  ))}
                                </td>
                                <td className="p-2 text-right font-mono">NT$ {Number(o.total || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">尚無訂單紀錄</p>
                    )}
                  </div>
                </>
              );
            })()}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setSelectedCustomer(null)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">關閉</button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default CRM;