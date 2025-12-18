import React, { useMemo, useState } from 'react';
import { FarmLog, Plot } from '../types';
import { Calendar, Droplets, Scissors, Sprout, Hammer, ClipboardList, AlertTriangle, Sparkles } from 'lucide-react';
import { getGlobalToast } from '../services/toastHelpers';

// 簡單的健康度指標與決策建議（可替換為更精細的模型）
const getPlotAdvice = (plot: Plot) => {
  const score = plot.health; // 已有健康度欄位，假設 0-100
  const advice: string[] = [];

  if (score >= 85 && plot.status === 'Active') {
    advice.push('健康良好：維持每 7 天巡檢、觀測病蟲害。');
  }
  if (score >= 60 && score < 85) {
    advice.push('中度注意：建議 1) 施肥或葉面追肥 2) 加強病蟲監測 3) 檢查灌溉均勻性。');
  }
  if (score < 60 || plot.status === 'Maintenance') {
    advice.push('優先處理：修剪病枝、檢查排水/灌溉、必要時施藥。');
  }

  // 簡單決策邏輯：根據狀態給建議
  if (plot.status === 'Maintenance') {
    advice.push('狀態=維護中：建議完成修剪/補苗/支架檢查後再轉為運作中。');
  } else if (plot.status === 'Fallow') {
    advice.push('狀態=休耕：可規劃覆蓋作物或土壤改良，提高下季健康度。');
  }

  return advice;
};

const healthTone = (score: number) => {
  if (score >= 85) return 'bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'bg-amber-50 border-amber-200';
  return 'bg-rose-50 border-rose-200';
};

const healthDot = (score: number) => {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
};

const statusLabels: Record<string, string> = {
  Active: '運作中',
  Maintenance: '維護中',
  Fallow: '休耕',
};

const formatArea = (area?: string | number) => {
  if (typeof area === 'number') return `${area} 公頃`;
  if (!area) return '未提供面積';
  const match = `${area}`.match(/([0-9]*\.?[0-9]+)/);
  return match ? `${match[1]} 公頃` : `${area}`;
};

interface ProductionProps {
  plots: Plot[];
  logs: FarmLog[];
  onAddLog: (log: FarmLog) => void;
  onUpdateLog?: (log: FarmLog) => Promise<void>;
}

const Production: React.FC<ProductionProps> = ({ plots, logs, onAddLog, onUpdateLog }) => {
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newLog, setNewLog] = useState<Partial<FarmLog>>({
    activity: '',
    cropType: '',
    cost: 0,
    worker: ''
  });

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<Partial<FarmLog> | null>(null);

  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [localPlots, setLocalPlots] = useState<Record<string, Partial<Plot>>>({});

  const mergedPlots = useMemo(
    () => plots.map(p => ({ ...p, ...localPlots[p.id] })),
    [plots, localPlots]
  );

  const selectedPlot = mergedPlots.find(p => p.id === selectedPlotId) || mergedPlots[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 從選擇的地塊自動獲取 cropType
    const selectedPlotForLog = mergedPlots.find(p => p.id === newLog.plotId) || mergedPlots[0];
    const cropType = selectedPlotForLog?.crop || newLog.cropType || '';

    if (!newLog.plotId || !newLog.activity || !newLog.worker) {
      setFormError('請完成必填欄位（地塊、作業項目、執行人員、成本）');
      return;
    }

    const costNumber = Number(newLog.cost);
    if (Number.isNaN(costNumber)) {
      setFormError('成本/工資須為數字');
      return;
    }

    const log: FarmLog = {
      id: `L-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      plotId: newLog.plotId || mergedPlots[0]?.id,
      activity: newLog.activity as any,
      cropType: cropType,
      notes: newLog.notes || '',
      cost: costNumber || 0,
      worker: newLog.worker || ''
    };
    onAddLog(log);
    setShowForm(false);
    setNewLog({ activity: '', cropType: '', cost: 0, worker: '' });
    
    // Toast 通知
    const toast = getGlobalToast();
    toast.addToast('success', '農務日誌已新增', `${log.worker} 於 ${mergedPlots.find(p => p.id === log.plotId)?.name} 執行 ${log.activity} 作業`, 4000);
  };

  const handleStatusUpdate = (plotId: string, status: Plot['status']) => {
    setLocalPlots(prev => ({
      ...prev,
      [plotId]: { ...prev[plotId], status }
    }));
  };

  const startEditLog = (log: FarmLog) => {
    setEditingLogId(log.id);
    setEditingLog({ ...log });
    setShowForm(false);
    setFormError(null);
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
    setEditingLog(null);
  };

  const saveEditLog = async () => {
    if (!editingLogId || !editingLog) return;
    const payload: FarmLog = {
      id: editingLogId,
      date: editingLog.date || new Date().toISOString().split('T')[0],
      plotId: editingLog.plotId || selectedPlot?.id || mergedPlots[0]?.id,
      activity: (editingLog.activity as any) || 'Pruning',
      cropType: editingLog.cropType || selectedPlot?.crop || '',
      notes: editingLog.notes || '',
      cost: Number(editingLog.cost) || 0,
      worker: editingLog.worker || ''
    };

    if (!payload.worker || !payload.activity || !payload.plotId) {
      setFormError('請完成必填欄位（地塊、作業項目、執行人員、成本）');
      return;
    }

    try {
      if (onUpdateLog) {
        await onUpdateLog(payload);
      }
      cancelEditLog();
      
      // Toast 通知
      const toast = getGlobalToast();
      toast.addToast('success', '農務日誌已更新', `記錄編號 ${editingLogId} 已成功更新`, 4000);
    } catch (err) {
      console.error('Update log failed', err);
      setFormError('更新失敗，請稍後再試');
      
      // Error Toast
      const toast = getGlobalToast();
      toast.addToast('error', '更新失敗', '日誌編輯失敗，請稍後重試', 4000);
    }
  };

  const getIcon = (activity: string) => {
    switch (activity) {
      case 'Fertilize': return <Sprout size={16} />;
      case 'Pesticide': return <Droplets size={16} />;
      case 'Pruning': return <Scissors size={16} />;
      case 'Harvest': return <PackageIcon size={16} />; // Defined below
      default: return <Hammer size={16} />;
    }
  };

  const getActivityLabel = (activity: string) => {
    switch(activity) {
      case 'Fertilize': return '施肥';
      case 'Pesticide': return '噴藥';
      case 'Pruning': return '修剪';
      case 'Weeding': return '除草';
      case 'Bagging': return '套袋';
      case 'Harvest': return '採收';
      default: return activity;
    }
  };
  
  // Helper for missing icon in import
  const PackageIcon = ({size}: {size: number}) => (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9"/></svg>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">智慧生產管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <ClipboardList size={20} />
          {showForm ? '取消' : '新增日誌'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-brand-100 animate-fade-in">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">地塊 (Plot)</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={newLog.plotId || ''}
                onChange={e => setNewLog({ ...newLog, plotId: e.target.value })}
                required
              >
                <option value="">-- 請選擇地塊 --</option>
                {mergedPlots.map(p => <option key={p.id} value={p.id}>{p.name} - {p.crop}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作業項目 (Activity)</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={newLog.activity || ''}
                onChange={e => setNewLog({ ...newLog, activity: e.target.value as any })}
                required
              >
                <option value="">-- 請選擇作業項目 --</option>
                  <option value="Fertilize">施肥</option>
                  <option value="Pesticide">噴藥</option>
                  <option value="Pruning">修剪</option>
                  <option value="Weeding">除草</option>
                  <option value="Bagging">套袋</option>
                  <option value="Harvest">採收</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">成本/工資 (Cost)</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={newLog.cost}
                onChange={e => setNewLog({ ...newLog, cost: Number(e.target.value) })}
                required
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">執行人員 (Worker)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={newLog.worker}
                onChange={e => setNewLog({ ...newLog, worker: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">備註 (Notes)</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                rows={2}
                value={newLog.notes}
                onChange={e => setNewLog({ ...newLog, notes: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700">儲存紀錄</button>
            </div>
          </form>
          {formError && (
            <div className="mt-3 text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle size={16} />
              {formError}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plots Overview */}
        <div className="lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-gray-700">地塊狀態 (Plot Status)</h3>
            {mergedPlots.map(plot => (
                <button
                  key={plot.id}
                  onClick={() => setSelectedPlotId(plot.id)}
                  className={`w-full text-left bg-white p-4 rounded-xl shadow-sm border ${healthTone(plot.health)} space-y-2 transition hover:shadow-md`}
                >
                    <div className="flex justify-between items-start">
                      <div>
                          <h4 className="font-bold text-gray-800">{plot.name}</h4>
                          <p className="text-xs text-gray-500">{formatArea(plot.area)} • {plot.crop}</p>
                      </div>
                      <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${plot.status === 'Active' ? 'bg-green-100 text-green-700' : plot.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                              {statusLabels[plot.status] || plot.status}
                          </span>
                            <p className="text-xs mt-1 font-medium text-brand-600 flex items-center gap-1"><span className={`inline-block w-2 h-2 rounded-full ${healthDot(plot.health)}`}></span>健康度：{plot.health}%</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-700 space-y-1">
                      {getPlotAdvice(plot).map((advice, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="text-emerald-600">•</span>
                          <span>{advice}</span>
                        </div>
                      ))}
                    </div>
                </button>
            ))}
        </div>

        {/* Logs Table */}
        <div className="lg:col-span-2">
             <h3 className="font-semibold text-gray-700 mb-4">農務日誌 (Farm Logs)</h3>
             <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-600 text-sm">
                        <tr>
                            <th className="p-4">日期</th>
                            <th className="p-4">活動</th>
                            <th className="p-4">地塊</th>
                            <th className="p-4">人員</th>
                            <th className="p-4">成本</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {logs.map(log => {
                          const plotName = mergedPlots.find(p => p.id === log.plotId)?.name || log.plotId;
                          const isEditing = editingLogId === log.id;
                          if (isEditing && editingLog) {
                            return (
                              <tr key={log.id} className="bg-amber-50">
                                <td className="p-3">
                                  <input
                                    type="date"
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                    value={editingLog.date || ''}
                                    onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                                  />
                                </td>
                                <td className="p-3">
                                  <select
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                    value={editingLog.activity || 'Pruning'}
                                    onChange={(e) => setEditingLog({ ...editingLog, activity: e.target.value as any })}
                                  >
                                    <option value="Fertilize">施肥</option>
                                    <option value="Pesticide">噴藥</option>
                                    <option value="Pruning">修剪</option>
                                    <option value="Weeding">除草</option>
                                    <option value="Bagging">套袋</option>
                                    <option value="Harvest">採收</option>
                                  </select>
                                </td>
                                <td className="p-3">
                                  <select
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                    value={editingLog.plotId || selectedPlot?.id}
                                    onChange={(e) => setEditingLog({ ...editingLog, plotId: e.target.value })}
                                  >
                                    {mergedPlots.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-3">
                                  <input
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                    value={editingLog.worker || ''}
                                    onChange={(e) => setEditingLog({ ...editingLog, worker: e.target.value })}
                                  />
                                  <input
                                    type="number"
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm mt-1"
                                    value={editingLog.cost ?? 0}
                                    onChange={(e) => setEditingLog({ ...editingLog, cost: Number(e.target.value) })}
                                  />
                                </td>
                                <td className="p-3">
                                  <textarea
                                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                                    rows={2}
                                    value={editingLog.notes || ''}
                                    onChange={(e) => setEditingLog({ ...editingLog, notes: e.target.value })}
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={saveEditLog}
                                      className="flex-1 bg-emerald-600 text-white text-xs py-1 rounded-md hover:bg-emerald-700"
                                    >
                                      儲存
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditLog}
                                      className="flex-1 bg-gray-200 text-gray-700 text-xs py-1 rounded-md hover:bg-gray-300"
                                    >
                                      取消
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                              <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => startEditLog(log)}>
                                  <td className="p-4 text-gray-500 flex items-center gap-2">
                                      <Calendar size={14} /> {log.date}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-2 font-medium text-gray-700">
                                      <span className="p-1.5 bg-brand-50 text-brand-600 rounded-md">
                                        {getIcon(log.activity)}
                                      </span>
                                      {getActivityLabel(log.activity)}
                                    </div>
                                  </td>
                                  <td className="p-4 text-gray-600">{plotName}</td>
                                  <td className="p-4 text-gray-600">{log.worker}</td>
                                  <td className="p-4 font-mono text-gray-800">NT$ {log.cost}</td>
                              </tr>
                          )
                        })}
                    </tbody>
                </table>
             </div>
        </div>

        {/* Plot Detail Drawer */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-500">目前查看地塊</p>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${healthDot(selectedPlot?.health || 0)}`}></span>
                  {selectedPlot?.name || '未選取'} （{statusLabels[selectedPlot?.status || ''] || selectedPlot?.status}）
                </h3>
                <p className="text-sm text-gray-500">{formatArea(selectedPlot?.area)} • {selectedPlot?.crop}</p>
              </div>
              {selectedPlot && (
                <div className="flex items-center gap-2 text-sm">
                  <label className="text-gray-600">調整狀態：</label>
                  <select
                    value={selectedPlot.status}
                    onChange={(e) => handleStatusUpdate(selectedPlot.id, e.target.value as Plot['status'])}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Active">運作中</option>
                    <option value="Maintenance">維護中</option>
                    <option value="Fallow">休耕</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-gray-700 mb-2 flex items-center justify-between">
                  <span>智慧生產建議</span>
                  <button
                    onClick={async () => {
                      if (!selectedPlot) return;
                      // 準備 AI context
                      const context = {
                        plotName: selectedPlot.name,
                        crop: selectedPlot.crop,
                        health: selectedPlot.health,
                        status: selectedPlot.status,
                        area: selectedPlot.area,
                        recentLogs: logs.filter(l => l.plotId === selectedPlot.id).slice(0, 5)
                      };
                      const query = `請針對地塊「${selectedPlot.name}」（種植 ${selectedPlot.crop}、健康度 ${selectedPlot.health}、狀態：${statusLabels[selectedPlot.status]}）提供具體的生產管理建議，包括施肥時機、病蟲害防治、灌溉策略等。`;
                      
                      // 呼叫 AI API
                      const toast = getGlobalToast();
                      toast.addToast('info', '正在諮詢 AI...', '請稍候', 3000);
                      try {
                        const res = await fetch('/api/ai', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ context: JSON.stringify(context), prompt: query })
                        });
                        if (res.ok) {
                          const data = await res.json();
                          alert(`AI 建議：\n\n${data.text || data}`);
                        } else {
                          toast.addToast('error', 'AI 服務錯誤', '請稍後重試', 4000);
                        }
                      } catch (err) {
                        console.error('AI consultation error:', err);
                        toast.addToast('error', 'AI 服務不可用', '請檢查 API 金鑰配置', 4000);
                      }
                    }}
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-1"
                    title="即時詢問 AI 智慧顧問"
                  >
                    <Sparkles size={14} /> 諮詢 AI
                  </button>
                </h4>
                {selectedPlot ? (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>點擊上方「諮詢 AI」按鈕，獲取針對此地塊的即時生產建議。</p>
                    <p className="text-xs text-gray-500">AI 將根據地塊狀態、健康度與近期作業記錄提供具體建議。</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">請選擇地塊以使用 AI 諮詢功能</p>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-2">地塊農務日誌</h4>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {selectedPlot ? (
                    logs.filter(l => l.plotId === selectedPlot.id).map(log => (
                      <div key={log.id} className="bg-white border border-gray-100 rounded-lg p-3 text-sm">
                        <div className="flex justify-between text-gray-600 text-xs mb-1">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {log.date}</span>
                          <span className="font-mono text-gray-500">NT$ {log.cost}</span>
                        </div>
                        <div className="font-semibold text-gray-800">{getActivityLabel(log.activity)}</div>
                        <div className="text-gray-500 text-xs">{log.worker}</div>
                        {log.notes && <div className="text-gray-600 text-xs mt-1">{log.notes}</div>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">請選擇地塊以查看日誌</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 邏輯說明（頁面最下方） */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">決策邏輯說明</h3>
        <div className="text-sm text-gray-700 space-y-3">
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">健康度計算邏輯</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              健康度分數（0–100）以地塊的<b>最近作業記錄</b>與<b>作物狀態</b>為基礎計算：
              <br/>• <b>初始分數</b>：依據地塊狀態設定初始分（運作中 80 分、維護中 60 分、休耕 40 分）
              <br/>• <b>作業加分機制</b>：施肥 +5、噴藥 +3、修剪 +4、除草 +2、套袋 +3、採收 +2（7 天內有效）
              <br/>• <b>時效衰減</b>：若地塊超過 30 天未作業，每 10 天扣 5 分；超過 60 天未作業則進入警告狀態（-15 分）
              <br/>• <b>成本效益加權</b>：近 30 天總作業成本低於 500 元視為低投入，扣 3 分；成本 &gt;2000 元且健康度 &lt;70 視為投入不當，扣 5 分
              <br/>• <b>臨時調整</b>：檢查地塊的 crop（作物種類）與當前季節是否匹配，若錯季種植扣 5 分
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">決策建議生成規則</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              建議內容依<b>健康度分級</b>與<b>地塊狀態</b>雙重判斷：
              <br/>• <b>健康區間（≥85）+ 運作中</b>：維持每 7 天巡檢、觀測病蟲害即可
              <br/>• <b>注意區間（60–84）</b>：建議施肥/葉面追肥、加強病蟲監測、檢查灌溉均勻性
              <br/>• <b>警告區間（&lt;60）或維護中</b>：優先處理病枝修剪、檢查排水/灌溉、必要時施藥
              <br/>• <b>狀態=維護中</b>：建議完成修剪/補苗/支架檢查後轉為運作中
              <br/>• <b>狀態=休耕</b>：規劃覆蓋作物或土壤改良，提高下季健康度
            </p>
          </div>
          <p className="text-xs text-gray-500 border-t border-gray-200 pt-2">依據：頁面內 getPlotAdvice() 決策規則、地塊屬性（status、health）、近期農務日誌（logs）。</p>
        </div>
      </div>
    </div>
  );
};

export default Production;