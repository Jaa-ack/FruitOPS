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
    { productName: '', grade: 'A', qty: 1, price: 0 }
  ]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
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
        price: Number(i.price) || 0
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
        setNewItems([{ productName: '', grade: 'A', qty: 1, price: 0 }]);
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
    setNewItems(items => [...items, { productName: '', grade: 'A', qty: 1, price: 0 }]);
  };

  const removeItemRow = (idx: number) => {
    setNewItems(items => items.length === 1 ? items : items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
    {!safeOrders || safeOrders.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <ShoppingBag size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">暫無訂單資料</p>
        <p className="text-sm">訂單數據將在此顯示</p>
      </div>
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
              <div className="grid grid-cols-5 gap-2 text-xs text-gray-600 font-medium px-1">
              <div>商品</div>
              <div>等級</div>
              <div>數量</div>
              <div>單價 (NT$)</div>
              <div className="text-center">操作</div>
            </div>
            {newItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
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
                        <th className="p-4">訂單編號</th>
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
                                <td className="p-4 font-mono text-gray-500">{order.id}</td>
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