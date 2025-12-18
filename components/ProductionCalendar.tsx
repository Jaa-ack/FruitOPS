import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Droplet, Leaf, Wind, Sun } from 'lucide-react';
import {
  FRUIT_CYCLES,
  MONTH_INFO,
  getAvailableFruitsByMonth,
  getMonthPriority,
  FruitCycle,
  MonthInfo,
} from '../types/fruitCycle';

interface CalendarDay {
  month: number;
  monthName: string;
  cnMonthName: string;
  fruits: FruitCycle[];
  priority: 'high' | 'medium' | 'low';
  strategy: string;
}

const ProductionCalendar: React.FC = () => {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  // 按季節分組月份數據
  const calendarData: CalendarDay[] = useMemo(() => {
    return MONTH_INFO.map(monthInfo => ({
      month: monthInfo.month,
      monthName: monthInfo.monthName,
      cnMonthName: monthInfo.cnMonthName,
      fruits: getAvailableFruitsByMonth(monthInfo.month),
      priority: getMonthPriority(monthInfo.month),
      strategy: monthInfo.strategy,
    }));
  }, []);

  // 按季節分組
  const seasonedData = useMemo(() => {
    const grouped: Record<string, CalendarDay[]> = {
      Spring: [] as CalendarDay[],
      Summer: [] as CalendarDay[],
      Fall: [] as CalendarDay[],
      Winter: [] as CalendarDay[],
    };

    const seasonMap: Record<string, number[]> = {
      Spring: [2, 3, 4, 5],
      Summer: [6, 7, 8],
      Fall: [9, 10, 11],
      Winter: [12, 1],
    };

    calendarData.forEach(day => {
      for (const [season, months] of Object.entries(seasonMap)) {
        if (months.includes(day.month)) {
          grouped[season].push(day);
        }
      }
    });

    return grouped;
  }, [calendarData]);

  // 優先度圖標
  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const badges = {
      high: { icon: '🔥', label: '旺季', color: 'bg-red-100 text-red-800 border-red-300' },
      medium: { icon: '⚡', label: '準備期', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      low: { icon: '🌙', label: '淡季', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    };
    return badges[priority];
  };

  // 季節圖標與顏色
  const getSeasonStyle = (season: string) => {
    const styles = {
      Spring: {
        icon: Leaf,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        titleColor: 'text-green-700',
        cnName: '🌸 春季',
      },
      Summer: {
        icon: Sun,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        titleColor: 'text-yellow-700',
        cnName: '☀️ 夏季',
      },
      Fall: {
        icon: Wind,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        titleColor: 'text-orange-700',
        cnName: '🍂 秋季',
      },
      Winter: {
        icon: Droplet,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        titleColor: 'text-blue-700',
        cnName: '❄️ 冬季',
      },
    };
    return styles[season as keyof typeof styles] || styles.Spring;
  };

  // 水果品級顯示
  const renderFruitBadges = (fruit: FruitCycle) => {
    return (
      <div key={fruit.id} className="mb-2 p-2 bg-white rounded border border-gray-200">
        <div className="font-semibold text-gray-800">{fruit.cnName}</div>
        <div className="text-xs text-gray-600 mt-1">
          <div>品級: {fruit.grades.join(' / ')}</div>
          <div>冷藏: {fruit.storageTemp.min}~{fruit.storageTemp.max}°C</div>
          <div>定價: A ¥{fruit.pricing.A} | B ¥{fruit.pricing.B} | C ¥{fruit.pricing.C}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      {/* 標題 */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">📅 新新果園生產銷售行事曆</h2>
        <p className="text-gray-600 mt-2">
          根據水果生產週期設計的年度行銷決策指南。點擊月份查看詳細信息。
        </p>
      </div>

      {/* 4 個季節分組 */}
      <div className="space-y-8">
        {Object.entries(seasonedData).map(([season, months]) => {
          const seasonStyle = getSeasonStyle(season);
          const SeasonIcon = seasonStyle.icon;

          return (
            <div
              key={season}
              className={`rounded-lg border-2 ${seasonStyle.borderColor} ${seasonStyle.bgColor} p-6`}
            >
              {/* 季節標題 */}
              <div className="flex items-center gap-3 mb-4">
                <SeasonIcon className={`w-8 h-8 ${seasonStyle.titleColor}`} />
                <h3 className={`text-2xl font-bold ${seasonStyle.titleColor}`}>
                  {seasonStyle.cnName}
                </h3>
              </div>

              {/* 月份網格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {months.map(day => {
                  const priorityBadge = getPriorityBadge(day.priority);
                  const isExpanded = expandedMonth === day.month;

                  return (
                    <div
                      key={day.month}
                      className={`rounded-lg border-2 transition-all cursor-pointer ${
                        isExpanded
                          ? 'border-purple-500 bg-purple-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                      onClick={() => setExpandedMonth(isExpanded ? null : day.month)}
                    >
                      {/* 月份卡片 */}
                      <div className="p-4">
                        {/* 月份與優先度 */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-2xl font-bold text-gray-900">{day.cnMonthName}</div>
                            <div className="text-xs text-gray-500">{day.monthName}</div>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded border ${priorityBadge.color}`}
                          >
                            {priorityBadge.icon} {priorityBadge.label}
                          </span>
                        </div>

                        {/* 水果數量摘要 */}
                        <div className="mb-3">
                          {day.fruits.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {day.fruits.map(fruit => (
                                <span key={fruit.id} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                                  {fruit.cnName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">無新鮮水果</div>
                          )}
                        </div>

                        {/* 策略簡述 */}
                        <div className="text-sm text-gray-700 line-clamp-2 mb-2">
                          {day.strategy}
                        </div>

                        {/* 展開按鈕 */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                          <span className="text-xs text-gray-500">
                            {day.fruits.length} 品項
                          </span>
                          {isExpanded ? (
                            <ChevronLeft className="w-4 h-4 text-purple-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* 展開詳情 */}
                      {isExpanded && (
                        <div className="border-t-2 border-purple-200 bg-purple-50 p-4 space-y-3">
                          {/* 詳細策略 */}
                          <div>
                            <div className="text-xs font-semibold text-purple-900 mb-2">📋 行銷策略</div>
                            <div className="text-sm text-purple-800 leading-relaxed">{day.strategy}</div>
                          </div>

                          {/* 水果詳情 */}
                          {day.fruits.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-purple-900 mb-2">🍎 銷售水果</div>
                              <div className="space-y-2">
                                {day.fruits.map(fruit => renderFruitBadges(fruit))}
                              </div>
                            </div>
                          )}

                          {/* 關鍵建議 */}
                          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                            <div className="text-xs font-semibold text-blue-900 mb-1">💡 系統建議</div>
                            <ul className="text-xs text-blue-800 space-y-1">
                              {day.priority === 'high' && (
                                <>
                                  <li>✓ 高優先度月份，全力推進銷售</li>
                                  <li>✓ 確保冷藏庫容充足</li>
                                  <li>✓ VIP 客戶提前預約</li>
                                </>
                              )}
                              {day.priority === 'medium' && (
                                <>
                                  <li>✓ 準備期關鍵操作，勿延誤</li>
                                  <li>✓ 確保所有農務按計畫進行</li>
                                  <li>✓ 提前規劃資源與勞動力</li>
                                </>
                              )}
                              {day.priority === 'low' && (
                                <>
                                  <li>✓ 依靠冷藏庫存銷售</li>
                                  <li>✓ 重點清理臨期商品</li>
                                  <li>✓ 冬季維護與規劃下季</li>
                                </>
                              )}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 圖例 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">📖 圖例說明</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
              🔥 旺季
            </span>
            <span className="text-gray-600">銷售高峰期</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
              ⚡ 準備期
            </span>
            <span className="text-gray-600">農務關鍵期</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
              🌙 淡季
            </span>
            <span className="text-gray-600">庫存清理期</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🌡️</span>
            <span className="text-gray-600">冷藏溫度範圍</span>
          </div>
        </div>
      </div>

      {/* 年度概覽統計 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">📊 年度概覽</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-800">
          <div>
            <div className="font-semibold text-lg">8 個月</div>
            <div className="text-xs">銷售旺季（6月-1月）</div>
          </div>
          <div>
            <div className="font-semibold text-lg">4 個月</div>
            <div className="text-xs">休閒維護期（2月-5月）</div>
          </div>
          <div>
            <div className="font-semibold text-lg">4 種</div>
            <div className="text-xs">核心水果品項</div>
          </div>
          <div>
            <div className="font-semibold text-lg">3 個</div>
            <div className="text-xs">豐收重疊月份</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionCalendar;
