import React, { useState } from 'react';
import { FarmLog, Plot } from '../types';
import { Calendar, Droplets, Scissors, Sprout, Hammer, ClipboardList } from 'lucide-react';

interface ProductionProps {
  plots: Plot[];
  logs: FarmLog[];
  onAddLog: (log: FarmLog) => void;
}

const Production: React.FC<ProductionProps> = ({ plots, logs, onAddLog }) => {
  const [showForm, setShowForm] = useState(false);
  const [newLog, setNewLog] = useState<Partial<FarmLog>>({
    activity: 'Pruning',
    cropType: 'Honey Peach',
    cost: 0,
    worker: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const log: FarmLog = {
      id: `L-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      plotId: newLog.plotId || plots[0].id,
      activity: newLog.activity as any,
      cropType: newLog.cropType || '',
      notes: newLog.notes || '',
      cost: Number(newLog.cost) || 0,
      worker: newLog.worker || ''
    };
    onAddLog(log);
    setShowForm(false);
    setNewLog({ activity: 'Pruning', cropType: 'Honey Peach', cost: 0, worker: '' });
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
  
  // Helper for missing icon in import
  const PackageIcon = ({size}: {size: number}) => (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9"/></svg>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">智慧生產管理 (Production)</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <ClipboardList size={20} />
          {showForm ? '取消 (Cancel)' : '新增日誌 (Add Log)'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-brand-100 animate-fade-in">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">地塊 (Plot)</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={newLog.plotId}
                onChange={e => setNewLog({ ...newLog, plotId: e.target.value })}
              >
                {plots.map(p => <option key={p.id} value={p.id}>{p.name} - {p.crop}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作業項目 (Activity)</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={newLog.activity}
                onChange={e => setNewLog({ ...newLog, activity: e.target.value as any })}
              >
                <option value="Fertilize">施肥 (Fertilize)</option>
                <option value="Pesticide">噴藥 (Pesticide)</option>
                <option value="Pruning">修剪 (Pruning)</option>
                <option value="Weeding">除草 (Weeding)</option>
                <option value="Bagging">套袋 (Bagging)</option>
                <option value="Harvest">採收 (Harvest)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">成本/工資 (Cost)</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={newLog.cost}
                onChange={e => setNewLog({ ...newLog, cost: Number(e.target.value) })}
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">執行人員 (Worker)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={newLog.worker}
                onChange={e => setNewLog({ ...newLog, worker: e.target.value })}
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
                <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700">儲存紀錄 (Save)</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plots Overview */}
        <div className="lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-gray-700">地塊狀態 (Plot Status)</h3>
            {plots.map(plot => (
                <div key={plot.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-brand-500 flex justify-between items-center">
                    <div>
                        <h4 className="font-bold text-gray-800">{plot.name}</h4>
                        <p className="text-xs text-gray-500">{plot.area} • {plot.crop}</p>
                    </div>
                    <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${plot.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {plot.status}
                        </span>
                        <p className="text-xs mt-1 font-medium text-brand-600">Health: {plot.health}%</p>
                    </div>
                </div>
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
                            const plotName = plots.find(p => p.id === log.plotId)?.name || log.plotId;
                            return (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-gray-500 flex items-center gap-2">
                                        <Calendar size={14} /> {log.date}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 font-medium text-gray-700">
                                            <span className="p-1.5 bg-brand-50 text-brand-600 rounded-md">
                                                {getIcon(log.activity)}
                                            </span>
                                            {log.activity}
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
      </div>
    </div>
  );
};

export default Production;