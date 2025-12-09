import React from 'react';
import { Customer } from '../types';
import { User, Award, Clock, Star } from 'lucide-react';

interface CRMProps {
  customers: Customer[];
}

const CRM: React.FC<CRMProps> = ({ customers }) => {
  
  const getSegmentStyle = (segment: string) => {
    switch(segment) {
        case 'VIP': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'Stable': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'New': return 'bg-green-100 text-green-700 border-green-200';
        case 'At Risk': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">顧客關係管理 (CRM)</h2>
      
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
        {customers.map(customer => (
            <div key={customer.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
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
                            {customer.segment}
                        </span>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 flex items-center gap-1"><Award size={14}/> 累積消費</span>
                            <span className="font-medium text-gray-800">NT$ {customer.totalSpent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 flex items-center gap-1"><Clock size={14}/> 上次購買</span>
                            <span className="font-medium text-gray-800">{customer.lastOrderDate}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100">
                    <button className="w-full py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-sm font-medium transition-colors">
                        查看完整檔案 (360 Profile)
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default CRM;