import React from 'react';
import { InventoryItem } from '../types';
import { Archive, Thermometer, AlertCircle } from 'lucide-react';

interface InventoryProps {
  inventory: InventoryItem[];
}

const Inventory: React.FC<InventoryProps> = ({ inventory }) => {
  
  const getGradeColor = (grade: string) => {
    switch(grade) {
        case 'A': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'C': return 'bg-orange-100 text-orange-800 border-orange-200';
        default: return 'bg-gray-100 text-gray-800';
    }
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

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold border-l border-b ${getGradeColor(item.grade)}`}>
                      等級 {item.grade}
                  </div>
                  
                  <div className="mb-4">
                      <h4 className="text-lg font-bold text-gray-800">{item.productName}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Archive size={12} /> {item.location}
                      </p>
                  </div>

                  <div className="flex justify-between items-end">
                      <div>
                          <p className="text-xs text-gray-400">現有庫存</p>
                          <p className="text-2xl font-bold text-brand-600">{item.quantity}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs text-gray-400">採收日期</p>
                          <p className="text-sm font-medium text-gray-600">{item.harvestDate}</p>
                      </div>
                  </div>
                  
                  {/* Action Bar */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                      <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs py-2 rounded-md font-medium transition-colors">調整數量</button>
                      <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs py-2 rounded-md font-medium transition-colors">移動庫位</button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default Inventory;