import React, { useState } from 'react';
import { Sparkles, MessageSquare, Loader2 } from 'lucide-react';

interface GeminiAdvisorProps {
  contextData: any; // Entire app state simplified
}

// 簡化 Markdown 格式為純文本或簡單的 HTML
const parseMarkdownToReactNode = (text: string) => {
  // 移除 markdown 標題符號、清單符號等
  let cleaned = text
    .replace(/^#+\s+/gm, '') // 移除標題
    .replace(/^[-*]\s+/gm, '• ') // 清單符號統一為 •
    .replace(/`{3}[\s\S]*?`{3}/g, '') // 移除程式碼區塊
    .replace(/`([^`]+)`/g, '$1') // 移除反引號
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 先保存粗體內容
    .trim();

  // 分行處理，並在粗體文本前後加入 ** 標記以便識別
  return cleaned.split('\n').map((line, i) => {
    // 偵測粗體模式（例如 "建議1:" 這樣的）
    const boldPattern = /^([^:。，\n]+[:。，])/;
    const boldMatch = line.match(boldPattern);
    
    if (boldMatch) {
      const boldPart = boldMatch[1];
      const restPart = line.slice(boldPart.length);
      return (
        <div key={i} className="mb-2">
          <span className="font-bold text-gray-800">{boldPart}</span>
          <span className="text-gray-700">{restPart}</span>
        </div>
      );
    }
    return <div key={i} className="mb-1 text-gray-700">{line}</div>;
  });
};

const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({ contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-defined prompts for users
  const suggestions = [
    "根據目前庫存提出促銷建議",
    "分析最近的銷售趨勢並建議行動",
    "為 VIP 客戶撰寫親切的問候簡訊",
    "如何降低目前生產成本並提升效率?"
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

    try {
      const res = await (await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: simplifiedContext, prompt: query }) })).json();
      setResponse(res.text || res);
      // 自動打開視窗以展示回應
      setIsOpen(true);
    } catch (err) {
      setResponse('AI 服務發生錯誤');
      setIsOpen(true);
    }
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
              詢問 AI 顧問
          </span>
        </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col max-h-[600px] animate-fade-in-up">
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <h3 className="font-bold">欣欣果園 智慧顧問</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
            ✕
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 bg-gray-50 min-h-[300px] relative">
        {response && !loading ? (
          <div className="bg-white p-4 rounded-lg shadow-sm text-gray-800 text-sm leading-relaxed">
             {parseMarkdownToReactNode(response)}
          </div>
        ) : !response && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
             <MessageSquare size={32} />
             <p className="text-xs">請選擇下方建議或輸入問題</p>
          </div>
        ) : null}
        
        {loading && (
             <div className="flex flex-col items-center justify-center h-full">
                 <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                 <p className="text-sm text-gray-600">正在思考中...</p>
             </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
            {suggestions.map((s, i) => (
                <button 
                    key={i} 
                    onClick={() => handleAsk(s)}
                    disabled={loading}
                    className="whitespace-nowrap px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full hover:bg-indigo-100 border border-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {s}
                </button>
            ))}
        </div>
        <div className="flex gap-2">
            <input 
                type="text" 
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
                placeholder="輸入您的問題..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleAsk(prompt)}
                disabled={loading}
            />
            <button 
                onClick={() => handleAsk(prompt)}
                disabled={!prompt || loading}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Sparkles size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiAdvisor;