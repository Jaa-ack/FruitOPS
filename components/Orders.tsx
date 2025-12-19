import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Order } from '../types';
import { Search, Filter, Phone, Smartphone, FileText, ShoppingBag, Truck } from 'lucide-react';
import { getGlobalToast } from '../services/toastHelpers';

interface OrdersProps {
  orders: Order[];
  onOrderChange?: () => void; // Callback to refresh orders
}

const Orders: React.FC<OrdersProps> = ({ orders, onOrderChange }) => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [newOrder, setNewOrder] = useState({
    customerName: '',
    channel: 'Direct',
    total: 0
  });
  const [newItems, setNewItems] = useState([
    { productName: '', grade: 'A', qty: 1, price: 0, originPlotId: '' }
  ]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [gradesByProduct, setGradesByProduct] = useState<Record<string, string[]>>({});
  const [inventoryDetail, setInventoryDetail] = useState<any[]>([]);
  const [pickModal, setPickModal] = useState<{ open: boolean; order: Order | null; selections: Record<number, { inventoryId: string; qty: number }>}>({ open: false, order: null, selections: {} });

  // 價格預設對照表（產品名稱 + 等級 → 價格）
  const defaultPrices: Record<string, number> = {
    '蜜桃|A': 350,
    '蜜桃|B': 250,
    '蜜桃|C': 150,
    '水蜜桃|A': 400,
    '水蜜桃|B': 280,
    '水蜜桃|C': 180,
    '黃金桃|A': 320,
    '黃金桃|B': 220,
    '黃金桃|C': 120,
  };

  // 根據產品和等級獲取預設價格
  const getDefaultPrice = (productName: string, grade: string): number => {
    const key = `${productName}|${grade}`;
    return defaultPrices[key] || 200; // 找不到則預設 200
  };

  // 獲取客戶列表、產品名稱與等級配置
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, invRes, gradeRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/inventory'),
          fetch('/api/product-grades')
        ]);
        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(Array.isArray(custData) ? custData : []);
        }
        if (invRes.ok) {
          const invData = await invRes.json();
          const names = Array.from(new Set(invData.map((i: any) => i.product_name || i.productName).filter(Boolean)));
          setProductNames(names);
        }
        if (gradeRes.ok) {
          const gradeData = await gradeRes.json();
          // 期望資料格式：[{ product_name: '桃子', grades: ['A','B','C'] }, ...]
          if (Array.isArray(gradeData)) {
            const map: Record<string, string[]> = {};
            for (const row of gradeData) {
              const name = row.product_name || row.productName;
              const grades = row.grades || [];
              if (name && Array.isArray(grades)) map[name] = grades;
            }
            setGradesByProduct(map);
            // 若 inventory 為空，以 product_grades 的產品作為候選
            if (Object.keys(map).length && productNames.length === 0) {
              setProductNames(Object.keys(map));
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch customers/products:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchInventoryDetail = async () => {
      try {
        const res = await fetch('/api/inventory-detail');
        if (res.ok) {
          setInventoryDetail(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch inventory detail', err);
      }
    };
    fetchInventoryDetail();
  }, []);

  // Sanitize data to avoid runtime crashes if backend returns null/strings
  const safeOrders: Order[] = Array.isArray(orders)
    ? orders.map((o) => {
        let items: any[] = [];
        if (Array.isArray(o.items)) {
          items = o.items;
        } else if (typeof o.items === 'string') {
          try { items = JSON.parse(o.items); } catch { items = []; }
        }
        // 將不同來源欄位統一成前端使用格式
        const normItems = items.map((it: any) => ({
          productName: it.productName || it.product_name || it.name || '',
          grade: it.grade || 'A',
          qty: typeof it.qty === 'number' ? it.qty : (typeof it.quantity === 'number' ? it.quantity : 0),
          price: typeof it.price === 'number' ? it.price : 0,
        }));
        return {
          ...o,
          customerName: (o as any).customer_name || o.customerName || '未命名客戶',
          status: o.status || 'Pending',
          channel: o.channel || 'Direct',
          items: normItems,
        };
      })
    : [];

    const statusOptions: { key: string; label: string }[] = [
        { key: 'All', label: '全部' },
        { key: 'Pending', label: '待處理' },
        { key: 'Confirmed', label: '已確認' },
        { key: 'Shipped', label: '已出貨' },
        { key: 'Completed', label: '已完成' },
    ];

    const statusTransitions: Record<string, string[]> = {
        'Pending': ['Confirmed', 'Cancelled'],
        'Confirmed': ['Shipped', 'Cancelled'],
        'Shipped': ['Completed', 'Cancelled'],
        'Completed': [],
        'Cancelled': []
    };

    const mapStatusName = (status: string) => {
        switch(status) {
            case 'Pending': return '待處理';
            case 'Confirmed': return '已確認';
            case 'Shipped': return '已出貨';
            case 'Completed': return '已完成';
            case 'Cancelled': return '已取消';
            default: return status;
        }
    };

  const filteredOrders = safeOrders.filter(order => {
    const matchesFilter = filter === 'All' || order.status === filter;
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
        case 'Line': return <Smartphone size={16} className="text-green-500" />;
        case 'Phone': return <Phone size={16} className="text-blue-500" />;
        case 'Google Form': return <FileText size={16} className="text-purple-500" />;
        case 'Wholesale': return <Truck size={16} className="text-orange-500" />;
        default: return <ShoppingBag size={16} className="text-gray-500" />;
    }
  };

    const mapChannelName = (channel: string) => {
        switch(channel) {
            case 'Line': return 'LINE';
            case 'Phone': return '電話';
            case 'Google Form': return 'Google 表單';
            case 'Wholesale': return '批發';
            case 'Direct': return '直接銷售';
            default: return channel;
        }
    };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Confirmed': 'bg-blue-100 text-blue-800',
        'Shipped': 'bg-purple-100 text-purple-800',
        'Completed': 'bg-green-100 text-green-800',
        'Cancelled': 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
            {mapStatusName(status)}
        </span>
    );
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        onOrderChange?.();
        
        // Toast 通知
        const toast = getGlobalToast();
        const statusName: Record<string, string> = {
          'Pending': '待確認',
          'Confirmed': '已確認',
          'Shipped': '已出貨',
          'Completed': '已完成',
          'Cancelled': '已取消'
        };
        toast.addToast('success', '訂單狀態已更新', `訂單 ${orderId} 已更新為 ${statusName[newStatus] || newStatus}`, 4000);
      } else {
        const toast = getGlobalToast();
        toast.addToast('error', '狀態更新失敗', '伺服器返回錯誤', 4000);
      }
    } catch (err) {
      console.error('Status update error:', err);
      const toast = getGlobalToast();
      toast.addToast('error', '狀態更新失敗', '網路錯誤', 4000);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    await handleStatusChange(orderId, 'Cancelled');
  };

  const handleOpenPick = (order: Order) => {
    const selections: Record<number, { inventoryId: string; qty: number }> = {};
    order.items.forEach((it, idx) => {
      selections[idx] = { inventoryId: '', qty: it.qty || 0 };
    });
    setPickModal({ open: true, order, selections });
  };

  const availableOptions = (productName: string, grade: string) => {
    return inventoryDetail.filter((inv: any) => (inv.productName || inv.product_name) === productName && inv.grade === grade);
  };

  const handleSubmitPick = async () => {
    if (!pickModal.order) return;
    const picks: { inventoryId: string; quantity: number }[] = [];
    for (let i = 0; i < pickModal.order.items.length; i++) {
      const sel = pickModal.selections[i];
      const required = pickModal.order.items[i].qty || 0;
      if (!sel || !sel.inventoryId) {
        alert('請為每個品項選擇來源儲位');
        return;
      }
      if ((Number(sel.qty) || 0) <= 0) {
        alert('移動數量需大於 0');
        return;
      }
      if (Number(sel.qty) !== required) {
        alert(`取貨量需與需求完全相同 (需求 ${required})`);
        return;
      }
      const invRow = inventoryDetail.find((inv: any) => inv.id === sel.inventoryId);
      if (!invRow) {
        alert('選擇的庫存不存在');
        return;
      }
      if ((invRow.quantity || 0) < Number(sel.qty)) {
        alert('庫存不足，請重新選擇或調整數量');
        return;
      }
      picks.push({ inventoryId: sel.inventoryId, quantity: Number(sel.qty) });
    }

    try {
      const res = await fetch(`/api/orders/${pickModal.order.id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks, nextStatus: 'Confirmed' })
      });
      if (!res.ok) throw new Error('pick failed');
      setPickModal({ open: false, order: null, selections: {} });
      onOrderChange?.();
      // refresh inventory detail
      const invRes = await fetch('/api/inventory-detail');
      if (invRes.ok) setInventoryDetail(await invRes.json());
      
      // Toast 通知
      const toast = getGlobalToast();
      toast.addToast('success', '訂單揀貨已完成', `訂單 ${pickModal.order.id} 已完成揀貨並扣除庫存`, 4000);
    } catch (err) {
      console.error('Pick order error', err);
      const toast = getGlobalToast();
      toast.addToast('error', '揀貨失敗', '操作失敗，請檢查庫存和訂單內容', 4000);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedItems = newItems
      .filter(i => i.productName && i.qty > 0)
      .map(i => ({
        productName: i.productName,
        grade: i.grade || 'A',
        qty: Number(i.qty) || 1,
        price: Number(i.price) || 0,
        originPlotId: i.originPlotId || ''
      }));

    if (normalizedItems.length === 0) {
      alert('請至少新增一項商品');
      return;
    }

    const total = normalizedItems.reduce((sum, item) => sum + item.qty * (item.price || 0), 0);

    const payload = {
      customerName: newOrder.customerName || '未命名客戶',
      channel: newOrder.channel,
      status: 'Pending',
      items: normalizedItems,
      total
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        setNewOrder({ customerName: '', channel: 'Direct', total: 0 });
          setNewItems([{ productName: '', grade: 'A', qty: 1, price: 0, originPlotId: '' }]);
        onOrderChange?.();
        
        // Toast 通知
        const toast = getGlobalToast();
        toast.addToast('success', '訂單已建立', `${payload.customerName} 的訂單 (總額 $${total.toLocaleString()}) 已成功建立`, 4000);
      } else {
        const toast = getGlobalToast();
        toast.addToast('error', '建立訂單失敗', '伺服器返回錯誤，請稍後再試', 4000);
      }
    } catch (err) {
      console.error('Create order error:', err);
      const toast = getGlobalToast();
      toast.addToast('error', '建立訂單失敗', '網路錯誤，請檢查連線', 4000);
    }
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setNewItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItemRow = () => {
    setNewItems(items => [...items, { productName: '', grade: 'A', qty: 1, price: 0, originPlotId: '' }]);
  };

  const removeItemRow = (idx: number) => {
    setNewItems(items => items.length === 1 ? items : items.filter((_, i) => i !== idx));
  };

  const formatDateTime = (val?: string) => {
    if (!val) return '-';
    // Try parse ISO or YYYY-MM-DD
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

  return (
    <div className="space-y-6">
    {!safeOrders || safeOrders.length === 0 ? (
      <>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <ShoppingBag size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">暫無訂單資料</p>
          <p className="text-sm">訂單數據將在此顯示</p>
        </div>

        {/* 促銷優先品項與推薦客戶（依庫存時效 + RFM 分級理論） */}
        {(() => {
        const now = new Date();
        const agingDays = (d?: string) => {
          if (!d) return Infinity;
          const dt = new Date(d);
          if (isNaN(dt.getTime())) return Infinity;
          return Math.floor((now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24));
        };
        // 展示期（>14 天）視為臨期，需要優先促銷
        const displayItems = (inventoryDetail || [])
          .filter((it: any) => agingDays(it.harvestDate || it.harvest_date) > 14)
          .map((it: any) => ({
            productName: it.productName || it.product_name,
            grade: it.grade,
            quantity: Number(it.quantity) || 0,
            harvestDate: it.harvestDate || it.harvest_date,
            location: it.location || it.location_id
          }));

        // 聚合到產品層級（品名+等級）
        const aggMap: Record<string, { productName: string; grade: string; total: number; oldestDate?: string }> = {};
        for (const it of displayItems) {
          const key = `${it.productName}|${it.grade}`;
          const prev = aggMap[key] || { productName: it.productName, grade: it.grade, total: 0, oldestDate: it.harvestDate };
          const older = (!prev.oldestDate || agingDays(it.harvestDate) > agingDays(prev.oldestDate)) ? it.harvestDate : prev.oldestDate;
          aggMap[key] = { productName: it.productName, grade: it.grade, total: prev.total + it.quantity, oldestDate: older };
        }
        const promoList = Object.values(aggMap).sort((a, b) => b.total - a.total).slice(0, 6);

        // 推薦客戶（以 RFM 分級理論為基礎）
        const bySegment: Record<string, any[]> = {};
        (customers || []).forEach(c => {
          const seg = (c.segment || 'Regular');
          if (!bySegment[seg]) bySegment[seg] = [];
          bySegment[seg].push(c);
        });
        const pickTop = (list: any[], n = 3) => (Array.isArray(list) ? list.slice(0, n) : []);
        const theoryNotes = [
          'RFM 理論：Recency/Frequency/Monetary 越佳，促銷轉換率越高。',
          '臨期商品（>14天）建議走 Phone/Wholesale，搭配組合折扣提升出清速度。',
          '對 Loyal/Regular 分群推特惠組合；對 At Risk 用喚回方案（限時折扣）。'
        ];

        if (promoList.length === 0) return null;
        return (
          <>
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">促銷優先品項與推薦客戶</h3>
            <p className="text-xs text-gray-600 mb-3">
              依據採收日期與時效（展示期 &gt;14 天）判定促銷優先品項，並以 RFM 分群理論推薦客戶與通路。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promoList.map((p, idx) => {
                const loyal = pickTop(bySegment['VIP'] || bySegment['Stable'] || [], 2);
                const regular = pickTop(bySegment['Regular'] || [], 3);
                const atRisk = pickTop(bySegment['At Risk'] || [], 2);
                const oldest = agingDays(p.oldestDate);
                const channelAdvice = oldest > 21 ? 'Wholesale（大宗出清）' : 'Phone（電話組合促銷）';
                return (
                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{p.productName}（{p.grade}）</div>
                        <div className="text-xs text-gray-500">臨期量：{p.total}｜最早採收：{p.oldestDate || '-'}（{isFinite(oldest) ? `${oldest} 天前` : '未知'}）</div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">需優先促銷</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      建議通路：<b className="text-indigo-700">{channelAdvice}</b>；方案：<b>組合折扣 + 限時</b>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-gray-700 font-medium">推薦客戶</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                        <div>
                          <div className="text-[11px] text-gray-500">VIP/Stable（高價值）</div>
                          {loyal.length === 0 ? <div className="text-[11px] text-gray-400">無</div> : loyal.map((c, i) => (
                            <div key={i} className="text-[12px]">• {c.name || c.customer_name}</div>
                          ))}
                        </div>
                        <div>
                          <div className="text-[11px] text-gray-500">Regular（穩定）</div>
                          {regular.length === 0 ? <div className="text-[11px] text-gray-400">無</div> : regular.map((c, i) => (
                            <div key={i} className="text-[12px]">• {c.name || c.customer_name}</div>
                          ))}
                        </div>
                        <div>
                          <div className="text-[11px] text-gray-500">At Risk（喚回）</div>
                          {atRisk.length === 0 ? <div className="text-[11px] text-gray-400">無</div> : atRisk.map((c, i) => (
                            <div key={i} className="text-[12px]">• {c.name || c.customer_name}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 bg-white border border-indigo-200 rounded-md p-3">
              <div className="text-xs font-medium text-gray-700 mb-1">行銷建議理論依據</div>
              <ul className="text-[12px] text-gray-600 list-disc pl-5 space-y-1">
                {theoryNotes.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          </div>
          {/* 優先行銷對象（加權 RFM 公式） */}
          {(() => {
            // 構建 RFM 加權分數：R(0.4) F(0.3) M(0.3)
            const now = new Date();
            const dayDiff = (d?: string) => {
              if (!d) return 9999;
              const dt = new Date(d);
              if (isNaN(dt.getTime())) return 9999;
              return Math.floor((now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24));
            };
            // 以 orders 計算頻次與金額，recency 取最後訂單或客戶記錄
            const byName = (name: string) => (safeOrders || []).filter(o => (o.customerName || '').trim().toLowerCase() === (name || '').trim().toLowerCase());
            const candidates = (customers || []).map(c => {
              const os = byName(c.name || c.customer_name || '');
              const frequency = os.length;
              const monetary = os.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || Number(c.totalSpent || 0);
              const lastDate = os.reduce((max, o) => {
                const d = o.date || (o as any).createdAt || (o as any).created_at;
                return (d && (!max || String(d) > String(max))) ? d : max;
              }, c.lastOrderDate || undefined);
              const recencyDays = dayDiff(lastDate);
              return { name: c.name || c.customer_name, frequency, monetary, recencyDays };
            });
            if (candidates.length === 0) return null;
            const maxF = Math.max(1, ...candidates.map(x => x.frequency));
            const maxM = Math.max(1, ...candidates.map(x => x.monetary));
            const scoreOf = (x: {frequency:number; monetary:number; recencyDays:number}) => {
              const r = Math.exp(- (x.recencyDays || 9999) / 30); // 30 天衰減
              const f = (x.frequency || 0) / maxF;
              const m = (x.monetary || 0) / maxM;
              return 0.4 * r + 0.3 * f + 0.3 * m;
            };
            const ranked = candidates
              .map(x => ({...x, score: scoreOf(x)}))
              .sort((a, b) => b.score - a.score)
              .slice(0, 5);
            return (
              <div className="mt-6 bg-white border border-indigo-200 rounded-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">優先行銷對象（加權 RFM）</h3>
                <p className="text-xs text-gray-600 mb-3">公式：Score = 0.4·R + 0.3·F + 0.3·M，其中 R = e^{-天數/30}，F/M 以樣本最大值正規化。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ranked.map((c, i) => (
                    <div key={i} className="border border-gray-200 rounded-md p-3">
                      <div className="flex justify-between">
                        <div className="text-sm font-semibold text-gray-800">{c.name}</div>
                        <div className="text-xs text-indigo-700 font-mono">Score {c.score.toFixed(3)}</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-600">R：{isFinite(c.recencyDays) ? `${c.recencyDays} 天` : '未知'}；F：{c.frequency}；M：NT$ {Number(c.monetary).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          </>
        );
        })()}
      </>
    ) : (
      <>
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
     <h2 className="text-2xl font-bold text-gray-800">全通路訂單</h2>
        <div className="flex gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="搜尋訂單..." 
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button className="bg-white border border-gray-300 p-2 rounded-lg text-gray-600 hover:bg-gray-50">
                <Filter size={20} />
            </button>
        </div>
      </div>

      {/* New Order */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
        <h3 className="font-semibold text-gray-800 mb-3">快速新增訂單</h3>
        <form onSubmit={handleCreateOrder} className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">客戶名稱（必填）</label>
              <input
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                placeholder="輸入或選擇客戶"
                list="customer-list"
                value={newOrder.customerName}
                onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                required
              />
              <datalist id="customer-list">
                {customers.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">訂購通路</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                value={newOrder.channel}
                onChange={(e) => setNewOrder({ ...newOrder, channel: e.target.value })}
              >
                <option value="Direct">直接銷售</option>
                <option value="Line">LINE</option>
                <option value="Phone">電話</option>
                <option value="Wholesale">批發</option>
              </select>
            </div>
            {/* 移除來源與付款狀態欄位 */}
            <div className="flex items-end">
              <div className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                <p className="text-xs text-gray-500">總金額</p>
                <p className="font-bold text-lg text-brand-600">
                  NT$ {newItems.reduce((sum, i) => sum + (i.qty || 0) * (i.price || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
              <div className="grid grid-cols-6 gap-2 text-xs text-gray-600 font-medium px-1">
              <div>商品</div>
              <div>等級</div>
              <div>數量</div>
              <div>單價 (NT$)</div>
              <div>來源地塊（選填）</div>
              <div className="text-center">操作</div>
            </div>
            {newItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                <select
                  className="border border-gray-300 rounded-md px-3 py-2"
                  value={item.productName || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    const grades = gradesByProduct[name] || ['A','B','C'];
                    const newGrade = grades[0] || 'A';
                    const defaultPrice = getDefaultPrice(name || '', newGrade);
                    setNewItems(items => items.map((it, i) => 
                      i === idx ? { ...it, productName: name, grade: newGrade, price: defaultPrice } : it
                    ));
                  }}
                  required
                >
                  <option value="">-- 選擇商品 --</option>
                  {productNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select
                  className="border border-gray-300 rounded-md px-3 py-2"
                  value={item.grade}
                  onChange={(e) => {
                    const grade = e.target.value;
                    const defaultPrice = getDefaultPrice(item.productName || '', grade);
                    updateItem(idx, 'grade', grade);
                    updateItem(idx, 'price', defaultPrice);
                  }}
                  required
                >
                  {(gradesByProduct[item.productName] || ['A','B','C']).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="border border-gray-300 rounded-md px-3 py-2"
                  placeholder="數量"
                  value={item.qty}
                  onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                  required
                />
                <input
                  type="number"
                  min={0}
                  className="border border-gray-300 rounded-md px-3 py-2"
                  placeholder="單價"
                  value={item.price}
                  onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                  required
                />
                <input
                  type="text"
                  className="border border-gray-300 rounded-md px-3 py-2"
                  placeholder="例如 P-001"
                  value={item.originPlotId}
                  onChange={(e) => updateItem(idx, 'originPlotId', e.target.value)}
                />
                <div className="flex gap-1 justify-center">
                  {newItems.length === 1 ? (
                    <button 
                      type="button" 
                      onClick={addItemRow} 
                      className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 hover:bg-emerald-100 text-xs"
                    >
                      ➕ 新增
                    </button>
                  ) : (
                    <>
                      <button 
                        type="button" 
                        onClick={addItemRow} 
                        className="px-2 py-2 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 hover:bg-emerald-100 text-xs"
                      >
                        ➕
                      </button>
                      <button 
                        type="button" 
                        onClick={() => removeItemRow(idx)} 
                        className="px-2 py-2 bg-red-50 text-red-700 rounded-md border border-red-200 hover:bg-red-100 text-xs"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-gray-200">
            <button
              type="submit"
              className="px-6 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 font-medium"
            >
              ✓ 新增訂單
            </button>
          </div>
        </form>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
                    {statusOptions.map(status => (
                            <button 
                                key={status.key}
                                onClick={() => setFilter(status.key)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === status.key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                            >
                                    {status.label}
                            </button>
                    ))}
      </div>

    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 text-sm font-semibold border-b border-gray-200">
                    <tr>
                    <th className="p-4">訂單日期</th>
                    <th className="p-4">來源</th>
                        <th className="p-4">客戶名稱</th>
                        <th className="p-4">內容</th>
                        <th className="p-4 text-right">總金額</th>
                        <th className="p-4">狀態</th>
                        <th className="p-4">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 group">
                        <td className="p-4 text-gray-600">{formatDateTime((order as any).date || (order as any).createdAt)}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2" title={order.channel}>
                                        {getChannelIcon(order.channel)}
                                        <span className="hidden md:inline text-gray-600">{mapChannelName(order.channel)}</span>
                                    </div>
                                </td>
                                <td className="p-4 font-medium">
                                    <button
                                        onClick={() => navigate(`/crm?customer=${encodeURIComponent(order.customerName)}`)}
                                        className="text-brand-600 hover:text-brand-800 hover:underline cursor-pointer"
                                        title="點擊跳轉到客戶詳情"
                                    >
                                        {order.customerName}
                                    </button>
                                </td>
                                <td className="p-4 text-gray-600">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="text-xs">
                                        {item.productName} ({item.grade}) x {item.qty}{item.price ? ` @ NT$${item.price}` : ''}
                                      </div>
                                    ))}
                                </td>
                                <td className="p-4 text-right font-mono font-medium">NT$ {order.total.toLocaleString()}</td>
                                <td className="p-4">{getStatusBadge(order.status)}</td>
                                <td className="p-4 space-y-1 min-w-[180px]">
                                  {order.status === 'Pending' ? (
                                    <>
                                      <button
                                        onClick={() => handleOpenPick(order)}
                                        className="w-full text-left px-3 py-1 text-xs rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      >
                                        拿取水果
                                      </button>
                                      <button
                                        onClick={() => handleCancelOrder(order.id)}
                                        className="w-full text-left px-3 py-1 text-xs rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                                      >
                                        取消訂單
                                      </button>
                                    </>
                                  ) : (
                                    statusTransitions[order.status]?.length === 0 ? (
                                      <span className="text-xs text-gray-400">無可用動作</span>
                                    ) : (
                                      statusTransitions[order.status].map(nextStatus => (
                                        <button
                                          key={nextStatus}
                                          onClick={() => handleStatusChange(order.id, nextStatus)}
                                          className="w-full text-left px-3 py-1 text-xs rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100"
                                        >
                                          {mapStatusName(nextStatus)}
                                        </button>
                                      ))
                                    )
                                  )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400">沒有符合的訂單</td>
                        </tr>
                    )}
                </tbody>
            </table>
      </div>
    </div>

      {/* 取貨/扣庫存彈窗 */}
      {pickModal.open && pickModal.order && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPickModal({ open: false, order: null, selections: {} })}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-3xl w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-xs text-gray-500">訂單 {pickModal.order.id}</p>
                <h3 className="text-lg font-bold text-gray-800">拿取水果並扣庫存</h3>
              </div>
              <button className="text-gray-500" onClick={() => setPickModal({ open: false, order: null, selections: {} })}>✕</button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {pickModal.order.items.map((it, idx) => {
                const options = availableOptions(it.productName, it.grade);
                const sel = pickModal.selections[idx] || { inventoryId: '', qty: it.qty };
                return (
                  <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between text-sm mb-2">
                      <div className="font-semibold text-gray-800">{it.productName} / {it.grade}</div>
                      <div className="text-gray-600">需求：{it.qty}</div>
                    </div>
                    {options.length === 0 ? (
                      <p className="text-xs text-red-600">沒有對應品項的庫存可選</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                        <select
                          className="border rounded p-2"
                          value={sel.inventoryId}
                          onChange={(e) => setPickModal(prev => ({
                            ...prev,
                            selections: { ...prev.selections, [idx]: { inventoryId: e.target.value, qty: sel.qty } }
                          }))}
                        >
                          <option value="">-- 選擇儲位 --</option>
                          {options.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.location || opt.locationName || opt.location_id}｜庫存 {opt.quantity}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={it.qty}
                          className="border rounded p-2"
                          value={sel.qty}
                          onChange={(e) => setPickModal(prev => ({
                            ...prev,
                            selections: { ...prev.selections, [idx]: { inventoryId: sel.inventoryId, qty: Number(e.target.value) } }
                          }))}
                        />
                        <div className="text-xs text-gray-500">需至少 {it.qty}，不可超過該儲位庫存</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded" onClick={() => setPickModal({ open: false, order: null, selections: {} })}>取消</button>
              <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded" onClick={handleSubmitPick}>確認扣庫存並設為已確認</button>
            </div>
          </div>
        </div>
      )}
      </>
    )}
    </div>
  );
};

export default Orders;