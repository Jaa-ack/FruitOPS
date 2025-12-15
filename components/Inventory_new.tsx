import React, { useState, useEffect } from 'react';
import { Archive, ChevronDown, ChevronUp, Plus, Edit2, Trash2 } from 'lucide-react';

interface InventoryDetail {
  id: string;
  product_name: string;
  grade: string;
  quantity: number;
  location_name: string;
  location_id: string;
  harvest_date?: string;
}

interface InventorySummary {
  product_name: string;
  total_quantity: number;
  grade_count: number;
  location_count: number;
}

const Inventory: React.FC<{ inventory: any[] }> = () => {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [summarySummary, setSummarySummary] = useState<InventorySummary[]>([]);
  const [detailData, setDetailData] = useState<InventoryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryDetail | null>(null);
  const [formData, setFormData] = useState({
    product_name: '',
    grade: 'A',
    quantity: 0,
    location_id: ''
  });

  // 獲取數據
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, detailRes, locRes] = await Promise.all([
        fetch('/api/inventory-summary'),
        fetch('/api/inventory-detail'),
        fetch('/api/storage-locations')
      ]);

      if (summaryRes.ok) setSummarySummary(await summaryRes.json());
      if (detailRes.ok) setDetailData(await detailRes.json());
      if (locRes.ok) setStorageLocations(await locRes.json());
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
    return detailData.filter(d => d.product_name === productName);
  };

  const handleSaveItem = async () => {
    try {
      const response = await fetch('/api/inventory-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAddForm(false);
        setFormData({ product_name: '', grade: 'A', quantity: 0, location_id: '' });
        await fetchData();
      } else {
        alert('保存失敗');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('保存失敗');
    }
  };

  const groupByGrade = (items: InventoryDetail[]) => {
    return items.reduce((acc, item) => {
      if (!acc[item.grade]) acc[item.grade] = [];
      acc[item.grade].push(item);
      return acc;
    }, {} as Record<string, InventoryDetail[]>);
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

      {/* 新增表單 */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="產品名稱"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="p-2 border rounded"
            />
            <select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              className="p-2 border rounded"
            >
              <option value="A">A 級</option>
              <option value="B">B 級</option>
              <option value="C">C 級</option>
            </select>
            <input
              type="number"
              placeholder="數量"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="p-2 border rounded"
            />
            <select
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
              className="p-2 border rounded"
            >
              <option value="">-- 選擇位置 --</option>
              {storageLocations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
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
                const isExpanded = expandedProducts.has(summary.product_name);
                const productDetails = getProductDetails(summary.product_name);
                const groupedByGrade = groupByGrade(productDetails);

                return (
                  <React.Fragment key={summary.product_name}>
                    {/* 摘要行 */}
                    <tr className="border-b hover:bg-gray-50 cursor-pointer">
                      <td className="p-4">
                        <button
                          onClick={() => toggleProduct(summary.product_name)}
                          className="flex items-center gap-2 font-medium text-gray-800"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          {summary.product_name}
                        </button>
                      </td>
                      <td className="p-4 text-right font-semibold text-blue-600">
                        {summary.total_quantity}
                      </td>
                      <td className="p-4 text-right">{summary.grade_count}</td>
                      <td className="p-4 text-right">{summary.location_count}</td>
                      <td className="p-4 space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Edit2 size={16} />
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
                                      <span>
                                        📦 {item.location_name}
                                        {item.harvest_date && <span className="text-gray-500 text-xs"> ({item.harvest_date})</span>}
                                      </span>
                                      <span className="font-semibold text-gray-800">{item.quantity} 件</span>
                                      <div className="space-x-1">
                                        <button className="text-blue-600 hover:text-blue-800 text-xs">
                                          <Edit2 size={14} />
                                        </button>
                                        <button className="text-red-600 hover:text-red-800 text-xs">
                                          <Trash2 size={14} />
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
    </div>
  );
};

export default Inventory;
