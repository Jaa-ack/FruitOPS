import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Customer } from '../types';
import { User, Award, Clock, Search, Zap, Pencil } from 'lucide-react';
import { getGlobalToast } from '../services/toastHelpers';

interface CRMProps {
  customers: Customer[];
}

const CRM: React.FC<CRMProps> = ({ customers }) => {
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const [segmentation, setSegmentation] = useState<any[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; phone: string; segment: string }>({ name: '', phone: '', segment: 'Regular' });
  
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
            case 'Regular': return '一般客戶';
            case 'New': return '新客';
            case 'At Risk': return '流失風險';
            default: return segment;
        }
    };

  const formatDateTime = (val?: string) => {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const Y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    return `${Y}/${M}/${D} ${h}:${m}`;
  };

  // 計算客戶 RFM 分級
  const handleCalculateSegmentation = async () => {
    try {
      setCalculating(true);
      const res = await fetch('/api/customers/segmentation/calculate');
      if (res.ok) {
        const data = await res.json();
        setSegmentation(data.segmentation || []);
        
        const toast = getGlobalToast();
        toast.addToast('success', 'RFM 分級已計算', `已分析 ${data.segmentation?.length || 0} 位客戶`, 4000);
      } else {
        const toast = getGlobalToast();
        toast.addToast('error', '計算失敗', '伺服器返回錯誤', 4000);
      }
    } catch (err) {
      console.error('Segmentation calculation error:', err);
      const toast = getGlobalToast();
      toast.addToast('error', '計算失敗', '網路錯誤', 4000);
    } finally {
      setCalculating(false);
    }
  };

  // 應用分級變更
  const handleApplySegmentation = async () => {
    try {
      if (!segmentation || segmentation.length === 0) {
        const toast = getGlobalToast();
        toast.addToast('warning', '無分級變更', '請先計算分級', 4000);
        return;
      }
      
      const updates = segmentation.map(s => ({ id: s.id, segment: s.segment }));
      const res = await fetch('/api/customers/segmentation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentUpdates: updates })
      });
      
      if (res.ok) {
        const data = await res.json();
        const toast = getGlobalToast();
        toast.addToast('success', '分級已應用', data.message || '客戶分級已更新至系統', 4000);
        setSegmentation([]); // 清除計算結果
      } else {
        const toast = getGlobalToast();
        toast.addToast('error', '應用失敗', '伺服器返回錯誤', 4000);
      }
    } catch (err) {
      console.error('Apply segmentation error:', err);
      const toast = getGlobalToast();
      toast.addToast('error', '應用失敗', '網路錯誤', 4000);
    }
  };

  // 手動更新單個客戶分級
  const handleUpdateCustomerSegment = async (customerId: string, newSegment: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/segment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment: newSegment })
      });
      
      if (res.ok) {
        const toast = getGlobalToast();
        const custName = safeCustomers.find(c => c.id === customerId)?.name || 'Customer';
        toast.addToast('success', '客戶分級已更新', `${custName} 已更新為 ${mapSegmentName(newSegment)}`, 4000);
      } else {
        const toast = getGlobalToast();
        toast.addToast('error', '更新失敗', '無法更新分級', 4000);
      }
    } catch (err) {
      console.error('Update customer segment error:', err);
      const toast = getGlobalToast();
      toast.addToast('error', '更新失敗', '網路錯誤', 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-2xl font-bold text-gray-800">顧客關係管理 (CRM)</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCalculateSegmentation}
            disabled={calculating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition"
          >
            <Zap size={18} />
            {calculating ? '計算中...' : '計算 RFM 分級'}
          </button>
          {segmentation.length > 0 && (
            <button
              onClick={handleApplySegmentation}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              <Award size={18} />
              應用分級 ({segmentation.length})
            </button>
          )}
        </div>
        {highlightedCustomer && (
          <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            已搜尋: {highlightedCustomer}
          </span>
        )}
      </div>
      
      {/* 顯示計算中的分級預覽 */}
      {segmentation.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-2">分級計算預覽</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {segmentation.map(s => (
              <div key={s.id} className="bg-white p-2 rounded border border-blue-100 text-sm">
                <div className="font-medium text-gray-800">{s.name}</div>
                <div className="text-xs text-gray-600">購買 {s.rfm?.frequency || 0} 次 | 消費 ${(s.rfm?.monetary || 0).toLocaleString()} | 最近 {s.rfm?.recencyDays || 0} 天</div>
                <div className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${
                  s.segment === 'VIP' ? 'bg-purple-100 text-purple-700' :
                  s.segment === 'Stable' ? 'bg-blue-100 text-blue-700' :
                  s.segment === 'New' ? 'bg-green-100 text-green-700' :
                  s.segment === 'At Risk' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{mapSegmentName(s.segment)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
        {/* 移除 RFM 說明卡片，依需求簡化介面 */}

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

                <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="w-full py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        查看完整檔案
                    </button>
                    
                    {/* 依需求：移除快速調整分級，改於顧客設定中調整 */}
                </div>
            </div>
          );
        })}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start justify-between w-full">
                <p className="text-xs text-gray-500">客戶檔案</p>
                <h3 className="text-xl font-bold text-gray-800">{selectedCustomer.name}</h3>
                <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                <button
                  className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  onClick={() => { setEditing(true); setEditForm({ name: selectedCustomer.name, phone: selectedCustomer.phone || '', segment: selectedCustomer.segment || 'Regular' }); }}
                  title="編輯顧客資訊"
                >
                  <Pencil size={14} /> 編輯
                </button>
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
                    <p>上次購買：{stats.lastDate ? formatDateTime(stats.lastDate) : '未紀錄'}</p>
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
                                <td className="p-2 text-gray-600">{formatDateTime(o.date || o.createdAt)}</td>
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
            {/* 編輯區塊 */}
            {editing && (
              <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">編輯顧客設定</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <label className="block">
                    <span className="text-xs text-gray-600">姓名</span>
                    <input className="mt-1 w-full border rounded px-2 py-1" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">電話</span>
                    <input className="mt-1 w-full border rounded px-2 py-1" value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">分級</span>
                    <select className="mt-1 w-full border rounded px-2 py-1" value={editForm.segment} onChange={(e) => setEditForm(f => ({ ...f, segment: e.target.value }))}>
                      <option value="VIP">貴賓</option>
                      <option value="Stable">穩定客群</option>
                      <option value="Regular">一般客戶</option>
                      <option value="New">新客</option>
                      <option value="At Risk">流失風險</option>
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button className="px-3 py-1 text-sm bg-gray-200 rounded" onClick={() => setEditing(false)}>取消</button>
                  <button
                    className="px-3 py-1 text-sm bg-brand-600 text-white rounded"
                    onClick={async () => {
                      if (!selectedCustomer) return;
                      try {
                        const res = await fetch(`/api/customers/${selectedCustomer.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: editForm.name, phone: editForm.phone, segment: editForm.segment })
                        });
                        if (res.ok) {
                          const updated = await res.json().catch(() => null);
                          setSelectedCustomer(prev => prev ? { ...prev, ...editForm } as Customer : prev);
                          setEditing(false);
                          const toast = getGlobalToast();
                          toast.addToast('success', '已更新顧客資料', `${editForm.name} 的設定已更新`, 4000);
                        } else {
                          const toast = getGlobalToast();
                          toast.addToast('error', '更新失敗', '伺服器返回錯誤', 4000);
                        }
                      } catch (e) {
                        const toast = getGlobalToast();
                        toast.addToast('error', '更新失敗', '網路錯誤', 4000);
                      }
                    }}
                  >
                    儲存
                  </button>
                </div>
              </div>
            )}
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