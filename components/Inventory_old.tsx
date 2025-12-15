import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { Archive, Thermometer, AlertCircle, Edit2, Check, X, Plus, Minus } from 'lucide-react';

interface InventoryProps {
  inventory: InventoryItem[];
  onInventoryChange?: () => void; // Callback to refresh inventory
}

interface StorageLocation {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

interface MovementRecord {
  id: string;
  quantity: number; // 移動數量
  newLocationId: string; // 使用 location_id 而非 string location
  newLocationName: string; // 顯示用的位置名稱
}

const Inventory: React.FC<InventoryProps> = ({ inventory, onInventoryChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'quantity' | 'location' | null>(null);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  
  // 計算機模式
  const [originalQuantity, setOriginalQuantity] = useState(0);
  const [calculatedQuantity, setCalculatedQuantity] = useState(0);
  const [operation, setOperation] = useState<'+' | '-' | null>(null);
  const [operationValue, setOperationValue] = useState(0);
  
  // 移動庫位模式
  const [editingLocationId, setEditingLocationId] = useState<string>('');
  const [movementRecords, setMovementRecords] = useState<MovementRecord[]>([]);
  const [tempMovementQty, setTempMovementQty] = useState(0);

  // 初始化時獲取存儲位置
  useEffect(() => {
    const fetchStorageLocations = async () => {
      try {
        const response = await fetch('/api/storage-locations');
        if (response.ok) {
          const data = await response.json();
          setStorageLocations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch storage locations:', err);
      }
    };
    fetchStorageLocations();
  }, []);

  // 簡易商務決策建議 (EOQ / 安全庫存)
  const quantities = inventory.map(i => Number(i.quantity) || 0);
  const totalQty = quantities.reduce((a, b) => a + b, 0);
  const meanQty = quantities.length ? totalQty / quantities.length : 0;
  const variance = quantities.length ? quantities.reduce((acc, q) => acc + Math.pow(q - meanQty, 2), 0) / quantities.length : 0;
  const stdQty = Math.sqrt(variance);
  const leadTimeDays = 5; // 假設補貨前置 5 天
  const dailyDemand = Math.max(1, Math.round((totalQty / Math.max(1, inventory.length)) / 30)); // 以庫存均值估計日需求
  const safetyStock = Math.round(1.65 * stdQty * Math.sqrt(leadTimeDays)); // 正態服務水準 95%
  const reorderPoint = Math.max(0, dailyDemand * leadTimeDays + safetyStock);
  const demandYear = dailyDemand * 365;
  const holdingCostRate = 0.2; // 假設年持有成本率 20%
  const unitCost = 300; // 假設單位成本 300 元
  const eoq = Math.round(Math.sqrt((2 * demandYear * unitCost) / (holdingCostRate * unitCost))) || 0;

  const getGradeColor = (grade: string) => {
    switch(grade) {
        case 'A': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'C': return 'bg-orange-100 text-orange-800 border-orange-200';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 開始調整數量（計算機模式）
  const handleQuantityEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditMode('quantity');
    setOriginalQuantity(item.quantity);
    setCalculatedQuantity(item.quantity);
    setOperation(null);
    setOperationValue(0);
  };

  // 執行運算
  const performCalculation = () => {
    if (operation && operationValue > 0) {
      const newQty = operation === '+' 
        ? calculatedQuantity + operationValue 
        : Math.max(0, calculatedQuantity - operationValue);
      setCalculatedQuantity(newQty);
      setOperation(null);
      setOperationValue(0);
    }
  };

  // 保存數量變更
  const handleSaveQuantity = async (itemId: string) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: calculatedQuantity })
      });
      if (response.ok) {
        setEditingId(null);
        setEditMode(null);
        onInventoryChange?.();
      } else {
        alert('更新失敗');
      }
    } catch (err) {
      console.error('Save quantity error:', err);
      alert('更新失敗');
    }
  };

  // 開始移動庫位
  const handleLocationEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditMode('location');
    setEditingLocationId(item.location_id || '');
    setMovementRecords([]);
    setTempMovementQty(0);
  };

  // 新增移動記錄
  const addMovementRecord = () => {
    if (tempMovementQty > 0 && editingLocationId) {
      const selectedLocation = storageLocations.find(loc => loc.id === editingLocationId);
      if (selectedLocation) {
        setMovementRecords([
          ...movementRecords,
          {
            id: `mov-${Date.now()}`,
            quantity: tempMovementQty,
            newLocationId: editingLocationId,
            newLocationName: selectedLocation.name
          }
        ]);
        setTempMovementQty(0);
        setEditingLocationId('');
      }
    }
  };

  // 保存位置變更
  const handleSaveLocation = async (itemId: string) => {
    try {
      // 計算最後的目的地位置 ID
      const finalLocationId = movementRecords.length > 0 
        ? movementRecords[movementRecords.length - 1].newLocationId 
        : editingLocationId;
      
      const response = await fetch(`/api/inventory/${itemId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: finalLocationId })
      });
      if (response.ok) {
        setEditingId(null);
        setEditMode(null);
        setMovementRecords([]);
        onInventoryChange?.();
      } else {
        alert('更新失敗');
      }
    } catch (err) {
      console.error('Save location error:', err);
      alert('更新失敗');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditMode(null);
    setOperation(null);
    setOperationValue(0);
    setMovementRecords([]);
    setTempMovementQty(0);
    setEditingLocationId('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">分級與庫存 (Grading & Inventory)</h2>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-xl border border-emerald-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-200 rounded-lg text-emerald-700">
                   <Archive size={20} />
                </div>
                <h3 className="font-semibold text-gray-700">總庫存量</h3>
            </div>
            <p className="text-2xl font-bold text-gray-800 pl-1">{inventory.reduce((a, b) => a + b.quantity, 0)} <span className="text-sm text-gray-500 font-normal">單位 (Units)</span></p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-blue-200 rounded-lg text-blue-700">
                   <Thermometer size={20} />
                </div>
                <h3 className="font-semibold text-gray-700">冷藏庫位</h3>
            </div>
            <p className="text-2xl font-bold text-gray-800 pl-1">2 <span className="text-sm text-gray-500 font-normal">個使用中</span></p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-white p-4 rounded-xl border border-red-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-red-200 rounded-lg text-red-700">
                   <AlertCircle size={20} />
                </div>
                <h3 className="font-semibold text-gray-700">庫存過期預警</h3>
            </div>
            <p className="text-2xl font-bold text-gray-800 pl-1">0 <span className="text-sm text-gray-500 font-normal">批次</span></p>
        </div>
      </div>

      {/* 商務決策建議 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">再訂購點 (Reorder Point)</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{reorderPoint}</p>
          <p className="text-xs text-gray-500">公式：日需求 x 前置天數 + 安全庫存；安全庫存=1.65×σ×√L</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">經濟訂購量 EOQ</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{eoq}</p>
          <p className="text-xs text-gray-500">公式：EOQ = √(2DS/H)，假設成本 300、持有率 20%</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">建議動作</p>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>庫存低於再訂購點時，補貨量建議 ≈ EOQ 或以需求高品項優先。</li>
            <li>若標準差高，調整安全庫存：提高服務水準或縮短前置時間。</li>
            <li>定期校正日需求與前置天數，確保模型符合實際銷售節奏。</li>
          </ul>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map(item => {
            const productName = (item as any).product_name || item.productName || '未命名品項';
            const harvestDate = (item as any).harvest_date || item.harvestDate || '未知';
            const location = (item as any).location || '未指定';
            
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold border-l border-b ${getGradeColor(item.grade)}`}>
                      等級 {item.grade}
                  </div>
                  
                  <div className="mb-3">
                      <h4 className="text-lg font-bold text-gray-800 mb-1">{productName}</h4>
                      <div className="flex flex-col gap-1 text-xs">
                        <p className="text-gray-500 flex items-center gap-1">
                            <Archive size={12} /> 庫位：{location}
                        </p>
                        <p className="text-gray-500">採收：{harvestDate}</p>
                      </div>
                  </div>

                  <div className="bg-gradient-to-r from-brand-50 to-blue-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-500 mb-1">現有庫存</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-brand-600">{item.quantity}</p>
                        <p className="text-sm text-gray-600">單位</p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-white/50">
                        <p className="text-xs text-gray-600">
                          {item.quantity < 50 ? '⚠️ 庫存偏低，建議補貨' : 
                           item.quantity > 200 ? '📦 庫存充足' : 
                           '✓ 庫存正常'}
                        </p>
                      </div>
                  </div>
                  
                  {/* Action Bar */}
                  {editingId === item.id && editMode === 'quantity' ? (
                    // 計算機模式
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">原始數量: <span className="font-bold text-gray-800">{originalQuantity}</span></p>
                        <p className="text-2xl font-bold text-brand-600 text-center mb-3">{calculatedQuantity}</p>
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => setOperation('+')}
                            className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 ${
                              operation === '+' 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Plus size={16} /> 加入
                          </button>
                          <button
                            onClick={() => setOperation('-')}
                            className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 ${
                              operation === '-' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Minus size={16} /> 拿走
                          </button>
                        </div>
                        {operation && (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={operationValue}
                              onChange={(e) => setOperationValue(Number(e.target.value))}
                              placeholder="輸入數量"
                              min="1"
                            />
                            <button
                              onClick={performCalculation}
                              className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                            >
                              計算
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveQuantity(item.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <Check size={14} /> 確認
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <X size={14} /> 取消
                        </button>
                      </div>
                    </div>
                  ) : editingId === item.id && editMode === 'location' ? (
                    // 移動庫位模式
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">輸入移動數量：</label>
                          <input
                            type="number"
                            className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={tempMovementQty}
                            onChange={(e) => setTempMovementQty(Math.min(Number(e.target.value), item.quantity))}
                            placeholder="輸入數量"
                            min="1"
                            max={item.quantity}
                          />
                          <p className="text-xs text-gray-400 mt-1">可用: {item.quantity}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">選擇目的地庫位：</label>
                          <select
                            className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editingLocationId}
                            onChange={(e) => setEditingLocationId(e.target.value)}
                          >
                            <option value="">-- 選擇庫位 --</option>
                            {storageLocations.map(loc => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.type})
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={addMovementRecord}
                          disabled={!tempMovementQty || !editingLocationId}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs py-2 rounded-md font-medium transition-colors"
                        >
                          新增移動記錄
                        </button>
                      </div>
                      
                      {/* 移動記錄列表 */}
                      {movementRecords.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1">
                          <p className="text-xs font-semibold text-blue-900 mb-2">移動計畫：</p>
                          {movementRecords.map((record, idx) => (
                            <div key={record.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-blue-100">
                              <span className="text-gray-700">{record.quantity} 件 → <span className="font-semibold">{record.newLocationName}</span></span>
                              <button
                                onClick={() => setMovementRecords(movementRecords.filter(r => r.id !== record.id))}
                                className="text-red-600 hover:text-red-800"
                              >
                                移除
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveLocation(item.id)}
                          disabled={movementRecords.length === 0}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <Check size={14} /> 確認
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <X size={14} /> 取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 正常視圖
                    <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                        <button 
                          onClick={() => handleQuantityEdit(item)}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <Edit2 size={14} /> 調整數量
                        </button>
                        <button 
                          onClick={() => handleLocationEdit(item)}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <Edit2 size={14} /> 移動庫位
                        </button>
                    </div>
                  )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Inventory;