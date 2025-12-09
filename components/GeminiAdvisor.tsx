import React, { useState } from 'react';
import { getGeminiAdvice } from '../services/geminiService';
import { Sparkles, MessageSquare, Loader2 } from 'lucide-react';

interface GeminiAdvisorProps {
  contextData: any; // Entire app state simplified
}

const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({ contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-defined prompts for users
  const suggestions = [
    "根據當前庫存，建議促銷策略 (Suggest promo based on inventory)",
    "分析最近的銷售趨勢 (Analyze sales trends)",
    "針對 VIP 客戶寫一段問候簡訊 (Write SMS for VIPs)",
    "如何降低目前生產成本? (How to reduce production costs?)"
  ];

  const handleAsk = async (query: string) => {
    setLoading(true);
    setResponse('');
    setPrompt(query);
    
    // Prepare context to be less verbose for tokens
    const simplifiedContext = JSON.stringify({
      inventorySummary: contextData.inventory.map((i: any) => ({ name: i.productName, grade: i.grade, qty: i.quantity })),
      orderSummary: { 
        totalOrders: contextData.orders.length, 
        revenue: contextData.orders.reduce((acc: number, curr: any) => acc + curr.total, 0),
        recent: contextData.orders.slice(0, 3) 
      },
      topCustomers: contextData.customers.filter((c: any) => c.segment === 'VIP').map((c: any) => c.name)
    });

    const result = await getGeminiAdvice(simplifiedContext, query);
    setResponse(result);
    setLoading(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 z-50 flex items-center gap-2 group"
      >
        <Sparkles size={24} className="animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap">
            Ask AI Advisor
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col max-h-[600px] animate-fade-in-up">
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <h3 className="font-bold">FruitOPS 智慧顧問</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
            ✕
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 bg-gray-50 min-h-[300px]">
        {response ? (
          <div className="bg-white p-4 rounded-lg shadow-sm text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
             {response}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
             <MessageSquare size={32} />
             <p className="text-xs">請選擇下方建議或輸入問題</p>
          </div>
        )}
        
        {loading && (
             <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl z-10">
                 <Loader2 className="animate-spin text-indigo-600" size={32} />
             </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
            {suggestions.map((s, i) => (
                <button 
                    key={i} 
                    onClick={() => handleAsk(s)}
                    className="whitespace-nowrap px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full hover:bg-indigo-100 border border-indigo-100 transition-colors"
                >
                    {s}
                </button>
            ))}
        </div>
        <div className="flex gap-2">
            <input 
                type="text" 
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="輸入您的問題..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk(prompt)}
            />
            <button 
                onClick={() => handleAsk(prompt)}
                disabled={!prompt}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
                <Sparkles size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiAdvisor;