/**
 * 欣欣果園生產銷售週期配置
 * 定義每個水果的生產、銷售、休閒週期
 */

export interface FruitCycle {
  id: string;
  name: string;
  cnName: string;
  grades: Array<'A' | 'B' | 'C'>;
  harvestStartMonth: number;    // 1-12
  harvestEndMonth: number;      // 1-12
  harvestDays: number;          // 總生產週期天數
  storageTemp: {
    min: number;
    max: number;
    unit: '°C';
  };
  shelfLife: {
    temp: number;
    days: number;
  };
  pricing: {
    [key: string]: number;      // 'A' | 'B' | 'C' -> 價格
  };
  marketing: {
    peakMonths: number[];       // 最佳銷售月份
    offSeasonStrategy: string;
  };
  description: string;
}

export interface SeasonInfo {
  season: string;
  months: number[];
  cnName: string;
  characteristics: string;
}

/**
 * 核心水果品項配置
 */
export const FRUIT_CYCLES: FruitCycle[] = [
  {
    id: 'peach',
    name: 'Peach',
    cnName: '水蜜桃',
    grades: ['A', 'B', 'C'],
    harvestStartMonth: 6,         // 6月中旬開始
    harvestEndMonth: 9,           // 9月下旬結束
    harvestDays: 120,             // 約4個月
    storageTemp: {
      min: 2,
      max: 4,
      unit: '°C',
    },
    shelfLife: {
      temp: 2,                     // 常溫時效
      days: 5,
    },
    pricing: {
      A: 400,
      B: 280,
      C: 180,
    },
    marketing: {
      peakMonths: [7, 8],          // 7-8月為最佳銷售季
      offSeasonStrategy: '推廣冷藏庫存、清倉優惠',
    },
    description: '夏季水蜜桃，盛產期7-8月，品質最優，冷藏保鮮5天',
  },
  {
    id: 'pear',
    name: 'Pear',
    cnName: '水梨',
    grades: ['A', 'B', 'C'],
    harvestStartMonth: 8,          // 8月上旬開始
    harvestEndMonth: 11,           // 11月中旬結束
    harvestDays: 120,
    storageTemp: {
      min: 0,
      max: 2,
      unit: '°C',
    },
    shelfLife: {
      temp: 0,                      // 冷藏時效
      days: 30,
    },
    pricing: {
      A: 350,
      B: 250,
      C: 150,
    },
    marketing: {
      peakMonths: [9, 10],          // 9-10月為盛產期
      offSeasonStrategy: '強化冷藏保鮮、為聖誕禮盒提供素材',
    },
    description: '秋季水梨，10月品質最穩定，冷藏可保30天',
  },
  {
    id: 'apple',
    name: 'Honeycrisp Apple',
    cnName: '蜜蘋果',
    grades: ['A', 'B', 'C'],
    harvestStartMonth: 9,          // 9月下旬開始
    harvestEndMonth: 12,           // 12月中旬結束
    harvestDays: 120,
    storageTemp: {
      min: -1,
      max: 1,
      unit: '°C',
    },
    shelfLife: {
      temp: -1,                     // 深冷時效
      days: 60,
    },
    pricing: {
      A: 320,
      B: 220,
      C: 120,
    },
    marketing: {
      peakMonths: [10, 11],         // 10-11月為最優品質期
      offSeasonStrategy: '聖誕/跨年禮盒組合、冷藏銷售',
    },
    description: '秋冬蜜蘋果，深冷可保60天，聖誕檔期強勢產品',
  },
  {
    id: 'persimmon',
    name: 'Persimmon',
    cnName: '柿子',
    grades: ['A', 'B'],
    harvestStartMonth: 10,         // 10月上旬開始
    harvestEndMonth: 1,            // 1月下旬結束（跨年）
    harvestDays: 150,              // 約5個月
    storageTemp: {
      min: 0,
      max: 2,
      unit: '°C',
    },
    shelfLife: {
      temp: 0,
      days: 45,
    },
    pricing: {
      A: 280,
      B: 150,
    },
    marketing: {
      peakMonths: [11, 12],         // 11-12月為盛產期
      offSeasonStrategy: '新年禮品、持續冷藏銷售',
    },
    description: '秋冬柿子，冷藏可保45天，跨年銷售主力',
  },
];

/**
 * 季節定義
 */
export const SEASONS: SeasonInfo[] = [
  {
    season: 'Spring',
    months: [2, 3, 4, 5],
    cnName: '春季',
    characteristics: '無新鮮水果，依靠冷藏庫存，準備夏季水蜜桃',
  },
  {
    season: 'Summer',
    months: [6, 7, 8],
    cnName: '夏季',
    characteristics: '水蜜桃盛產，主要銷售季，高庫存期',
  },
  {
    season: 'Fall',
    months: [9, 10, 11],
    cnName: '秋季',
    characteristics: '多品項交替上市（水梨、蜜蘋果、柿子），品項豐富',
  },
  {
    season: 'Winter',
    months: [12, 1],
    cnName: '冬季',
    characteristics: '柿子主打，聖誕/跨年檔期，清倉剩餘庫存',
  },
];

/**
 * 月份信息：顯示該月份的水果可用性、行銷策略
 */
export interface MonthInfo {
  month: number;
  monthName: string;
  cnMonthName: string;
  availableFruits: string[];       // 可銷售水果ID
  harvestingFruits: string[];      // 當月收穫的水果ID
  season: string;
  strategy: string;
  priority: 'high' | 'medium' | 'low';
}

export const MONTH_INFO: MonthInfo[] = [
  {
    month: 1,
    monthName: 'January',
    cnMonthName: '1月',
    availableFruits: ['persimmon'],            // 柿子冷藏
    harvestingFruits: [],
    season: 'Winter',
    strategy: '柿子產季收尾，冬季修剪期開始，準備春季',
    priority: 'low',
  },
  {
    month: 2,
    monthName: 'February',
    cnMonthName: '2月',
    availableFruits: [],                       // 無新鮮水果
    harvestingFruits: [],
    season: 'Spring',
    strategy: '清理冬季庫存，冬季修剪與施肥，準備新年',
    priority: 'low',
  },
  {
    month: 3,
    monthName: 'March',
    cnMonthName: '3月',
    availableFruits: [],
    harvestingFruits: [],
    season: 'Spring',
    strategy: '春季修剪完成，準備人工授粉，庫存清理促銷',
    priority: 'low',
  },
  {
    month: 4,
    monthName: 'April',
    cnMonthName: '4月',
    availableFruits: [],
    harvestingFruits: [],
    season: 'Spring',
    strategy: '水蜜桃花期管理、人工授粉，為夏季準備',
    priority: 'medium',
  },
  {
    month: 5,
    monthName: 'May',
    cnMonthName: '5月',
    availableFruits: [],
    harvestingFruits: [],
    season: 'Spring',
    strategy: '疏果、套袋、施肥，蓄能準備，預購宣傳開始',
    priority: 'medium',
  },
  {
    month: 6,
    monthName: 'June',
    cnMonthName: '6月',
    availableFruits: ['peach'],                // 水蜜桃上市
    harvestingFruits: ['peach'],               // 6月中旬開始收穫
    season: 'Summer',
    strategy: '水蜜桃上市初期，品質逐步改善，VIP預購開放',
    priority: 'high',
  },
  {
    month: 7,
    monthName: 'July',
    cnMonthName: '7月',
    availableFruits: ['peach'],
    harvestingFruits: ['peach'],
    season: 'Summer',
    strategy: '水蜜桃盛產期，最優品質，全力銷售推進',
    priority: 'high',
  },
  {
    month: 8,
    monthName: 'August',
    cnMonthName: '8月',
    availableFruits: ['peach', 'pear'],        // 水梨上市
    harvestingFruits: ['peach', 'pear'],
    season: 'Summer/Fall',
    strategy: '水蜜桃銷售高峰，水梨初上市，冷藏備貨關鍵',
    priority: 'high',
  },
  {
    month: 9,
    monthName: 'September',
    cnMonthName: '9月',
    availableFruits: ['pear', 'apple'],        // 蜜蘋果上市
    harvestingFruits: ['pear', 'apple'],
    season: 'Fall',
    strategy: '水蜜桃銷售結束，水梨進入盛產，蜜蘋果初上市',
    priority: 'high',
  },
  {
    month: 10,
    monthName: 'October',
    cnMonthName: '10月',
    availableFruits: ['pear', 'apple', 'persimmon'],  // 柿子上市
    harvestingFruits: ['pear', 'apple', 'persimmon'],
    season: 'Fall',
    strategy: '多品項並行，水梨盛產，蜜蘋果進入盛產，柿子初上市',
    priority: 'high',
  },
  {
    month: 11,
    monthName: 'November',
    cnMonthName: '11月',
    availableFruits: ['apple', 'persimmon'],   // 水梨銷售結束
    harvestingFruits: ['apple', 'persimmon'],
    season: 'Fall',
    strategy: '水梨銷售結束，蜜蘋果盛產，柿子盛產，聖誕備貨',
    priority: 'high',
  },
  {
    month: 12,
    monthName: 'December',
    cnMonthName: '12月',
    availableFruits: ['apple', 'persimmon'],   // 蜜蘋果銷售結束
    harvestingFruits: ['persimmon'],
    season: 'Winter',
    strategy: '蜜蘋果銷售結束，柿子持續銷售，聖誕/跨年禮盒檔期，冬季維護開始',
    priority: 'high',
  },
];

/**
 * 實用函數
 */

/**
 * 根據月份取得可用水果清單
 */
export function getAvailableFruitsByMonth(month: number): FruitCycle[] {
  const monthInfo = MONTH_INFO[month - 1];
  return FRUIT_CYCLES.filter(fruit => monthInfo.availableFruits.includes(fruit.id));
}

/**
 * 取得該水果是否在銷售季
 */
export function isFruitInSeason(fruitId: string, month: number): boolean {
  const fruit = FRUIT_CYCLES.find(f => f.id === fruitId);
  if (!fruit) return false;

  // 處理跨年的情況（如柿子10月-1月）
  if (fruit.harvestStartMonth <= fruit.harvestEndMonth) {
    return month >= fruit.harvestStartMonth && month <= fruit.harvestEndMonth;
  } else {
    return month >= fruit.harvestStartMonth || month <= fruit.harvestEndMonth;
  }
}

/**
 * 取得月份的銷售策略
 */
export function getMonthStrategy(month: number): string {
  return MONTH_INFO[month - 1]?.strategy || '';
}

/**
 * 取得某月的行銷優先度
 */
export function getMonthPriority(month: number): 'high' | 'medium' | 'low' {
  return MONTH_INFO[month - 1]?.priority || 'low';
}

/**
 * 取得某個季節的月份
 */
export function getMonthsBySeasonName(seasonName: string): number[] {
  const season = SEASONS.find(s => s.season === seasonName || s.cnName === seasonName);
  return season?.months || [];
}
