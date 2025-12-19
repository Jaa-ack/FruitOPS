import React, { useState, useEffect } from 'react';
import { Archive, ChevronDown, ChevronUp, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { getGlobalToast } from '../services/toastHelpers';

interface InventoryDetail {
  id: string;
  productName: string;
  grade: string;
  quantity: number;
  location: string;
  locationId: string;
  harvestDate?: string;
  originPlotId?: string;
  originPlotName?: string | null;
}

interface InventorySummary {
  productName: string;
  totalQuantity: number;
  gradeCount: number;
  locationCount: number;
}

const Inventory: React.FC<{ inventory: any[]; onInventoryChange?: () => void }> = ({ onInventoryChange }) => {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [summarySummary, setSummarySummary] = useState<InventorySummary[]>([]);
  const [detailData, setDetailData] = useState<InventoryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [gradesByProduct, setGradesByProduct] = useState<Record<string, string[]>>({});
  const [moveAmount, setMoveAmount] = useState(0);
  const [moveTarget, setMoveTarget] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [moveModal, setMoveModal] = useState<{ open: boolean; item: InventoryDetail | null }>({ open: false, item: null });
  const [formData, setFormData] = useState({
    productName: '',
    grade: 'A',
    quantity: 0,
    locationId: '',
    harvestDate: '',
    originPlotId: ''
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [recommendModal, setRecommendModal] = useState<{ open: boolean; title: string; channels: string[] }>({ open: false, title: '', channels: [] });

  // 獲取數據
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, detailRes, locRes, gradesRes, customersRes] = await Promise.all([
        fetch('/api/inventory-summary'),
        fetch('/api/inventory-detail'),
        fetch('/api/storage-locations'),
        fetch('/api/product-grades'),
        fetch('/api/customers')
      ]);

      if (summaryRes.ok) {
        const summaryRaw = await summaryRes.json();
        // Normalize snake_case -> camelCase for UI consumption
        const summary = Array.isArray(summaryRaw) ? summaryRaw.map((row: any) => ({
          productName: row.productName ?? row.product_name,
          totalQuantity: row.totalQuantity ?? row.total_quantity ?? 0,
          gradeCount: row.gradeCount ?? row.grade_count ?? 0,
          locationCount: row.locationCount ?? row.location_count ?? 0,
        })) : [];
        setSummarySummary(summary);
      }
      if (detailRes.ok) {
        const detailRaw = await detailRes.json();
        const detail = Array.isArray(detailRaw) ? detailRaw.map((row: any) => ({
          id: row.id,
          productName: row.productName ?? row.product_name,
          grade: row.grade,
          quantity: row.quantity ?? row.qty ?? 0,
          location: row.location ?? row.location_name ?? '',
          locationId: row.locationId ?? row.location_id ?? '',
          harvestDate: row.harvestDate ?? row.harvest_date,
          originPlotId: row.originPlotId ?? row.origin_plot_id,
          originPlotName: row.originPlotName ?? row.origin_plot_name ?? null
        })) : [];
        setDetailData(detail);
      }
      if (locRes.ok) setStorageLocations(await locRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
      if (gradesRes.ok) {
        const gradeData = await gradesRes.json();
        if (Array.isArray(gradeData)) {
          const map: Record<string, string[]> = {};
          for (const row of gradeData) {
            const name = row.product_name || row.productName;
            const grades = row.grades || [];
            if (name && Array.isArray(grades)) map[name] = grades;
          }
          setGradesByProduct(map);
          setProductNames(Object.keys(map));
        }
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productName: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productName)) {
      newExpanded.delete(productName);
    } else {
      newExpanded.add(productName);
    }
    setExpandedProducts(newExpanded);
  };

  const getProductDetails = (productName: string) => {
    return detailData.filter(d => d.productName === productName);
  };

  const handleSaveItem = async () => {
    try {
      const response = await fetch('/api/inventory-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: formData.productName,
          grade: formData.grade,
          quantity: Number(formData.quantity) || 0,
          locationId: formData.locationId,
          harvestDate: formData.harvestDate || undefined,
          originPlotId: formData.originPlotId || undefined
        })
      });

      if (response.ok) {
        setShowAddForm(false);
        setFormData({ productName: '', grade: 'A', quantity: 0, locationId: '', harvestDate: '', originPlotId: '' });
        await fetchData();
        onInventoryChange?.();
        
        // Toast 通知
        const toast = getGlobalToast();
        const locName = storageLocations.find(l => l.id === formData.locationId)?.name || '未知儲位';
        toast.addToast('success', '庫存已新增', `${formData.productName} (${formData.grade}級) 數量 ${formData.quantity} 已新增至 ${locName}`, 4000);
      } else {
        const toast = getGlobalToast();
        toast.addToast('error', '保存失敗', '庫存新增失敗，請檢查輸入', 4000);
      }
    } catch (err) {
      console.error('Save error:', err);
      const toast = getGlobalToast();
      toast.addToast('error', '保存失敗', '網路錯誤，請稍後重試', 4000);
    }
  };

  const groupByGrade = (items: InventoryDetail[]) => {
    return items.reduce((acc, item) => {
      if (!acc[item.grade]) acc[item.grade] = [];
      acc[item.grade].push(item);
      return acc;
    }, {} as Record<string, InventoryDetail[]>);
  };

  const handleMoveSubmit = async (amount: number, targetLocationId: string) => {
    if (!moveModal.item) return;
    const qty = Number(amount) || 0;
    if (qty <= 0) {
      alert('移動數量需大於 0');
      return;
    }
    if (qty > (moveModal.item.quantity || 0)) {
      alert('移動數量不能超過庫存');
      return;
    }
    if (!targetLocationId || targetLocationId === moveModal.item.locationId) {
      alert('請選擇不同的目標儲位');
      return;
    }
    try {
      const res = await fetch('/api/inventory-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: moveModal.item.id, targetLocationId, amount: qty })
      });
      if (!res.ok) throw new Error('move failed');
      setMoveModal({ open: false, item: null });
      await fetchData();
      onInventoryChange?.();
      
      // Toast 通知
      const toast = getGlobalToast();
      const targetLoc = storageLocations.find(l => l.id === targetLocationId)?.name || '目標儲位';
      toast.addToast('success', '庫存已移動', `已移動 ${moveModal.item.productName} (${moveModal.item.grade}級) 數量 ${qty} 至 ${targetLoc}`, 4000);
    } catch (err) {
      console.error('Move inventory error', err);
      const toast = getGlobalToast();
      toast.addToast('error', '移動失敗', '庫存移動失敗，請稍後重試', 4000);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加載中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">分級庫存管理</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} /> 新增庫存
        </button>
      </div>

      {/* 庫存時效與通路配置建議（僅保留新鮮期/保鮮期，點擊可查看建議通路客戶） */}
      {(() => {
        const totalInventory = (summarySummary || []).reduce((sum, s) => sum + (Number(s.totalQuantity) || 0), 0);
        const now = new Date();
        const freshItems = (detailData || []).filter(d => {
          if (!d.harvestDate) return false;
          const harvestDate = new Date(d.harvestDate);
          const agingDays = Math.floor((now.getTime() - harvestDate.getTime()) / (1000 * 60 * 60 * 24));
          return agingDays <= 7;
        });
        const preservationItems = (detailData || []).filter(d => {
          if (!d.harvestDate) return false;
          const harvestDate = new Date(d.harvestDate);
          const agingDays = Math.floor((now.getTime() - harvestDate.getTime()) / (1000 * 60 * 60 * 24));
          return agingDays > 7 && agingDays <= 14;
        });
        // 取唯一的產品名稱，避免重複（例如同產品不同級別導致重複）
        const topNames = (items: any[]) => Array.from(new Set(items.map(i => i.productName))).slice(0, 3).join('、');
        const freshQty = freshItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        const preservationQty = preservationItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        // 通路中文名稱（與訂單管理一致）
        const channelDisplay = (ch: string) => {
          switch(ch) {
            case 'Direct': return '直接銷售';
            case 'Line': return 'LINE';
            case 'Wholesale': return '批發';
            case 'Phone': return '電話';
            default: return ch;
          }
        };
        const insights = [
          { key: 'fresh', label: '新鮮期庫存（≤7天）', value: `${freshQty} 單位`, color: 'text-green-600', advice: freshQty > 0 ? `優先配給 ${channelDisplay('Direct')}／${channelDisplay('Line')} 通路，主打 A/B 級品` : '無新鮮採收，依靠冷藏庫存', channels: ['Direct','Line'] },
          { key: 'preserve', label: '保鮮期庫存（8-14天）', value: `${preservationQty} 單位`, color: 'text-blue-600', advice: preservationQty > 0 ? `適合 ${channelDisplay('Phone')}／${channelDisplay('Wholesale')} 組合銷售` : '無保鮮期庫存', channels: ['Phone','Wholesale'] }
        ];
        return (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl shadow-sm border border-emerald-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={20} className="text-emerald-600" />
              庫存時效與通路配置建議
            </h3>
              <p className="text-xs text-gray-600 mb-4">
                依據：採收日期（harvest_date）計算時效分期（新鮮期 ≤7天、保鮮期 8-14天、展示期 &gt;14天），結合通路特性建議配置。
              <br/><b>通路建議</b>：{channelDisplay('Direct')}／{channelDisplay('Line')} 優先新鮮期 A/B 級；{channelDisplay('Phone')}／{channelDisplay('Wholesale')} 適合保鮮期組合；展示期建議促銷或加工。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((ins, idx) => (
                <button key={idx} className="text-left bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-emerald-300 focus:ring-2 focus:ring-emerald-200" onClick={() => setRecommendModal({ open: true, title: ins.label + '：建議通路客戶', channels: ins.channels })}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-gray-600 font-medium">{ins.label}</p>
                    <span className={`text-lg font-bold ${ins.color}`}>{ins.value}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">💡 {ins.advice}</p>
                </button>
              ))}
            </div>
            <div className="mt-4 bg-white p-4 rounded-lg border border-emerald-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">本週執行建議</h4>
              <div className="space-y-1 text-xs text-gray-600">
                {freshQty > 0 && (
                  <p>• <b>新鮮期優先</b>：將 {topNames(freshItems)} 等新鮮品優先配給 Direct／LINE 通路</p>
                )}
                {preservationQty > 100 && (
                  <p>• <b>保鮮期促銷</b>：{topNames(preservationItems)} 進入保鮮期，適合 Phone／Wholesale 組合銷售</p>
                )}
                {(freshQty === 0 && preservationQty === 0) && (
                  <p className="text-gray-500">• 無庫存或無採收日期記錄，請確保新入庫品項填寫 harvest_date</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 新增表單 */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select
              className="p-2 border rounded"
              value={formData.productName}
              onChange={(e) => {
                const name = e.target.value;
                const grades = gradesByProduct[name] || ['A', 'B', 'C'];
                const newGrade = grades[0] || 'A';
                setFormData({ ...formData, productName: name, grade: newGrade });
              }}
            >
              <option value="">-- 選擇產品 --</option>
              {productNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              className="p-2 border rounded"
            >
              {(gradesByProduct[formData.productName] || ['A','B','C']).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="數量"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="p-2 border rounded"
            />
            <select
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              className="p-2 border rounded"
            >
              <option value="">-- 選擇位置 --</option>
              {storageLocations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              type="date"
              placeholder="採收日期"
              value={formData.harvestDate}
              onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
              className="p-2 border rounded"
            />
            <input
              type="text"
              placeholder="來源地塊ID（選填，顯示時會轉為名稱）"
              value={formData.originPlotId}
              onChange={(e) => setFormData({ ...formData, originPlotId: e.target.value })}
              className="p-2 border rounded"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveItem}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              保存
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 庫存摘要表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold">產品名稱</th>
                <th className="p-4 font-semibold text-right">總庫存量</th>
                <th className="p-4 font-semibold text-right">級別數</th>
                <th className="p-4 font-semibold text-right">位置數</th>
                <th className="p-4 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {summarySummary.map(summary => {
                const isExpanded = expandedProducts.has(summary.productName);
                const productDetails = getProductDetails(summary.productName);
                const groupedByGrade = groupByGrade(productDetails);

                return (
                  <React.Fragment key={summary.productName}>
                    {/* 摘要行 */}
                    <tr className="border-b hover:bg-gray-50 cursor-pointer">
                      <td className="p-4">
                        <button
                          onClick={() => toggleProduct(summary.productName)}
                          className="flex items-center gap-2 font-medium text-gray-800"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          {summary.productName}
                        </button>
                      </td>
                      <td className="p-4 text-right font-semibold text-blue-600">
                        {summary.totalQuantity}
                      </td>
                      <td className="p-4 text-right">{summary.gradeCount}</td>
                      <td className="p-4 text-right">{summary.locationCount}</td>
                      <td className="p-4 space-x-2">
                        <button className="text-blue-600 hover:text-blue-800" onClick={() => setShowAddForm(true)}>
                          <Plus size={16} />
                        </button>
                      </td>
                    </tr>

                    {/* 展開行：顯示級別和位置詳情 */}
                    {isExpanded && (
                      <tr className="bg-gray-50 border-b">
                        <td colSpan={5} className="p-4">
                          <div className="space-y-3">
                            {Object.entries(groupedByGrade).map(([grade, items]) => (
                              <div key={grade} className="bg-white p-3 rounded border border-gray-200">
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                                    grade === 'A' ? 'bg-green-600' : grade === 'B' ? 'bg-blue-600' : 'bg-orange-600'
                                  }`}>
                                    {grade} 級
                                  </span>
                                  <span className="text-gray-600">小計: {items.reduce((sum, i) => sum + i.quantity, 0)} 單位</span>
                                </h4>
                                <div className="space-y-1 text-sm">
                                  {items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                      <div className="flex flex-col text-sm">
                                        <span>📦 {item.location}</span>
                                        {(item.originPlotName || item.originPlotId) && (
                                          <span className="text-xs text-gray-500">地塊：{item.originPlotName || item.originPlotId}</span>
                                        )}
                                      </div>
                                      <span className="font-semibold text-gray-800">{item.quantity} 件</span>
                                      <div className="space-x-1">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm" onClick={() => {
                                          setMoveAmount(Math.min(1, item.quantity));
                                          setMoveTarget('');
                                          setMoveModal({ open: true, item });
                                        }}>
                                          <Edit2 size={18} />
                                        </button>
                                        <button className="text-red-600 hover:text-red-800 text-sm" onClick={async () => {
                                          if (!confirm('確定要刪除此庫存項目嗎？')) return;
                                          try {
                                            const res = await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
                                            if (!res.ok) throw new Error('Delete failed');
                                            await fetchData();
                                            onInventoryChange?.();
                                          } catch (e) {
                                            alert('刪除失敗');
                                          }
                                        }}>
                                          <Trash2 size={18} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* 空狀態 */}
      {summarySummary.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Archive size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">暫無庫存數據</p>
        </div>
      )}

      {/* 移動庫存彈窗 */}
      {moveModal.open && moveModal.item && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setMoveModal({ open: false, item: null })}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">移動庫存</h3>
            <p className="text-sm text-gray-600 mb-3">
              {moveModal.item.productName} / {moveModal.item.grade} | 目前儲位：{moveModal.item.location} | 可用：{moveModal.item.quantity}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">目標儲位</label>
                <select
                  className="w-full border rounded p-2"
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                >
                  <option value="">-- 選擇位置 --</option>
                  {storageLocations.filter((loc: any) => loc.id !== moveModal.item?.locationId).map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">移動數量</label>
                <input
                  type="number"
                  min={1}
                  max={moveModal.item.quantity}
                  className="w-full border rounded p-2"
                  value={moveAmount}
                  onChange={(e) => setMoveAmount(Number(e.target.value))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded" onClick={() => setMoveModal({ open: false, item: null })}>取消</button>
                <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded" onClick={() => handleMoveSubmit(moveAmount, moveTarget)}>確認移動</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 建議通路客戶列表 Modal */}
      {recommendModal.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRecommendModal({ open: false, title: '', channels: [] })}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">{recommendModal.title}</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setRecommendModal({ open: false, title: '', channels: [] })}>關閉</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">顯示偏好通路為：{recommendModal.channels.join(' / ')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customers
                .filter(c => recommendModal.channels.includes(c.preferredChannel || ''))
                .map(c => (
                  <a key={c.id} href={`#/crm?customer=${encodeURIComponent(c.name)}`} className="block p-3 border rounded-lg hover:bg-gray-50">
                    <div className="font-medium text-gray-800">{c.name}</div>
                    <div className="text-xs text-gray-500">電話：{c.phone || '未提供'} | 分級：{c.segment || '未分級'}</div>
                  </a>
              ))}
              {customers.filter(c => recommendModal.channels.includes(c.preferredChannel || '')).length === 0 && (
                <p className="text-sm text-gray-500">目前沒有偏好該通路的客戶</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
