# 🍎 FruitOPS - 智能果園管理系統

完整的果園營運管理系統，整合了季節性決策、RFM 客戶分級、實時庫存管理、訂單流程自動化，搭配 AI 顧問提供智能決策建議。

---

## 🧭 營運藍圖與導入情境（欣欣果園）

本系統以「欣欣果園」為情境，將既有的人工/半人工營運流程數位化，目標是讓果園主與工作夥伴在「生產、庫存、訂單、客戶」四條主線上以最少步驟完成日常工作，同時產生可靠的決策依據。

- 角色分工
   - 果園主：查看行事曆與地塊健康，決定本週農務；審核重要訂單與高價值客戶
   - 倉儲/出貨：管理分級庫存、庫存移位、訂單揀貨與出貨
   - 業務：新增訂單、查看客戶分群、對 VIP/流失風險客做行動

- 核心流程整合
   1) 生產計畫：依《生產銷售行事曆》+《地塊健康》排點農務（修剪/施肥/套袋/採收）
   2) 入庫分級：採收後按品級與儲位入庫（多位置、多等級），即時可查庫存
   3) 接單/揀貨：多通路新增訂單→依需求逐品項揀貨→自動扣庫存→更新狀態
   4) 客戶運營：RFM 分群→對高價值/流失風險客執行行動→回饋到銷售/決策

以上四條線在系統中彼此關聯：行事曆決策指引生產，生產形成庫存，庫存支持訂單履約，訂單帶動客戶分群與回購策略，再反饋季節性銷售與生產排程。

## 🌐 線上試用

📱 **Vercel 部署版本**：[https://fruit-ops.vercel.app](https://fruit-ops.vercel.app)

---

## ✨ 核心功能

### 📊 決策與分析
- 🧠 **決策建議分頁化**：Dashboard 保留圖表與季節提示；Inventory/Orders/Production 各自呈現時效、促銷、AI 建議
- 📅 **生產銷售行事曆**：可視化水果季節週期（春/夏/秋/冬），按優先度分層推薦
- 👥 **RFM 客戶分級**：Recency/Frequency/Monetary 自動分段（VIP/Stable/Regular/New/AtRisk）
- 📈 **銷售通路分析**：多通路數據彙總與績效對比
- 🌡️ **作物健康評分**：地塊健康度追蹤與預防性農業建議

### 🎯 業務流程
- 🌳 **果園管理**：地塊資訊、作物健康追蹤、農事日誌、季節性農務規劃
- 📦 **分級庫存**：多位置、多品級、入庫/移位/刪除，入庫支援 `harvest_date`、`package_spec`、`batch_id`、`origin_plot_id`；依採收日期自動生成時效分期與通路配置建議
- 🛒 **訂單管理**：快速建單（含 `source`、`payment_status`、品項 `origin_plot_id`）、揀貨扣庫存、狀態流轉（Pending/Confirmed/Shipped/Completed）
- 📬 **客戶管理**：CRM + RFM 分級，客戶卡與檔案可編輯姓名/電話/分級/`region`/`preferred_channel`
- 📅 **生產銷售行事曆**：季節性供應與策略摘要

### 🤖 智能輔助
- 🧠 **AI 顧問**：Google Gemini 實時回答（庫存分析、銷售建議、成本優化、簡訊撰寫）
- 🔔 **全局通知**：Toast 系統通知所有表單操作（新增、更新、錯誤提示）

---

## 🛠 使用手冊（依頁面）

### 1) 生產銷售行事曆（總覽）
- 入口：Dashboard 上方或 Calendar 頁
- 命名：已統一顯示「欣欣果園生產銷售行事曆」
- 排序規則：春/夏/秋為月份遞增；冬季固定「12 月在 1 月左側」
- 顯示內容：各月水果供應、策略摘要與優先度徽章（旺季/準備期/淡季）
- 系統建議依據：
   - `types/fruitCycle.ts` 的 `MONTH_INFO.priority` 與各水果 `peakMonths`
   - 季節性可得性（當月可賣/需保鮮/規劃預售）

### 2) 智慧生產（地塊/農事）
- 查看各地塊健康分數、狀態與歷史農事紀錄
- 頁面最下方提供「決策邏輯說明」：
   - 健康度 ≥85：巡檢與預防；60–85：介入與調整；<60：緊急處置
   - 狀態（Active/Maintenance/Fallow）會調整建議強度

### 3) 分級庫存
- 功能：多位置、多品級、入庫、移位、摘要與明細查詢
- 時效決策：依 `harvest_date` 分期（新鮮期 ≤7、保鮮期 8–14、展示期 >14 天），自動給出通路配置與促銷/加工建議
- 表單欄位：`harvest_date`（必填）、`package_spec`、`batch_id`、`origin_plot_id`（選填）

### 4) 訂單管理
- 快速新增訂單（多品項，依水果動態載入品級）
- 新增欄位：`source`（通路來源）、`payment_status`，每個品項可填 `origin_plot_id`
- 新訂單若使用新客戶姓名，系統會自動建立該客戶（CRM 可見）
- 揀貨流程需為每項品項指定來源儲位且數量與需求一致，成功即扣庫存並更新狀態
- 表格第一欄為「訂單日期」，顯示格式 `yyyy/MM/dd HH:mm`

### 5) CRM 客戶管理
- 客戶卡片提供基本資訊與分群；點擊可打開客戶檔案彈窗
- 檔案內可「編輯」姓名/電話/分級，並填寫 `region`、`preferred_channel`
- 近期消費「日期顯示為 `yyyy/MM/dd HH:mm`」
- 介面已移除 RFM 說明卡與「快速調整分級」；分級調整改於顧客設定中進行

## 📊 分析方法論

系統應用多個經營管理理論確保決策有據可依：

### 1. **RFM 客戶分級法**
**計算公式**：

**Recency（近期性）分數**：
```
recencyDays = (今天 - 最後購買日期) / (1000 * 60 * 60 * 24)

評分規則：
≤7 天     → 5 分（極活躍）
8-30 天   → 4 分（活躍）
31-90 天  → 3 分（普通）
91-180 天 → 2 分（流失風險）
>180 天   → 1 分（已流失）
```

**Frequency（頻率）分數**：
```
frequency = 該客戶總訂單數

評分規則：
≥20 筆    → 5 分（超高頻）
10-19 筆  → 4 分（高頻）
5-9 筆    → 3 分（中頻）
2-4 筆    → 2 分（低頻）
1 筆      → 1 分（新客）
```

**Monetary（消費金額）分數**：
```
monetary = 該客戶累積消費總額

評分規則：
≥$50,000      → 5 分（超高消費）
$20,000-49,999 → 4 分（高消費）
$10,000-19,999 → 3 分（中消費）
$5,000-9,999   → 2 分（低消費）
<$5,000        → 1 分（極低消費）
```

**綜合分級規則**（總分 3-15 分）：
```
RFM 總分 = R分 + F分 + M分

分級邏輯：
🟣 VIP：      總分≥13 且 M≥4（高消費+高活躍）
🔵 Stable：   總分9-12 且 R≥3（定期回購）
🟢 New：      F=1 且 R≥4（首購且近期）
🔴 At Risk：  R≤2 且 F≥2（曾購買但長期未回購）
⚪ Regular：  其他情況（一般客戶）
```

**應用策略**：
- 🟣 **VIP**：專屬預購、高端禮盒、客製化服務、生日禮
- 🔵 **Stable**：定期優惠券、新品搶先看、會員日
- 🟢 **New**：首購折扣、產品推薦、歡迎禮
- 🔴 **At Risk**：流失挽回、專屬回購優惠、關懷簡訊
- ⚪ **Regular**：保持互動、節日促銷、提升回購頻率

**執行時機**：CRM 頁面點擊「計算 RFM 分級」→「套用分級」，建議每週或每月執行

### 2. **庫存 ABC 分類法**
- **A 級**：高價值、低數量、重點監控
- **B 級**：中等價值、中等數量、定期調整
- **C 級**：低價值、高數量、統一管理

**應用**：按品級別分配冷藏優先度、促銷策略不同

### 3. **庫存時效分級與通路配置**

考量果園收穫受天氣影響、不可精準補貨的特性，庫存策略從傳統「補貨/缺貨」轉為「時效管理 + 通路配置」。

**時效分期定義**（依 `harvest_date` 計算 `agingDays`）：
```
agingDays = (今天 - harvest_date) / (1000 * 60 * 60 * 24)

🟢 新鮮期：agingDays ≤ 7 天
   - A級：5-7天  B級：3-5天  C級：1-3天
   - 特性：品質最佳、售價最高
   - 目標：快速銷售、高回轉

🔵 保鮮期：7 < agingDays ≤ 14 天
   - 冷藏可維持的中期
   - 特性：品質良好、適合組合包
   - 目標：批發合作、組合促銷

🟠 展示期：agingDays > 14 天
   - 臨界或超期庫存
   - 特性：需立即處理、降價或加工
   - 目標：清倉促銷、二次加工
```

**通路配置策略**（對應系統通路：直接銷售/LINE/電話/批發）：
```
新鮮期 A/B 級：
  ✓ 直接銷售（Direct）：現場選購、品質保證
  ✓ LINE 通路：快速下單、當日配送
  ✓ 電話預購（Phone）：VIP 客戶專屬
  ✗ 避免：長途運輸、批發（耗時）

保鮮期 B/C 級：
  ✓ 批發（Wholesale）：大量出貨、價格優惠
  ✓ 電話（Phone）：組合包銷售
  ✓ LINE 促銷：限時優惠、組合包
  ✗ 避免：單件零售（效率低）

展示期（所有等級）：
  ✓ 批發清倉：大量降價出清
  ✓ 加工通路：果醬、烘乾、冷凍
  ✓ 促銷包：買一送一、福利品
  ✗ 避免：正常銷售（品質風險）
```

**優先級排序**（每日/每週執行）：
```
P0（緊急）：展示期庫存 → 立即清倉或加工
P1（重要）：新鮮期即將轉保鮮期 → 推高回轉通路
P2（常規）：保鮮期高庫存 → 安排批發與組合促銷
P3（觀察）：新鮮期正常庫存 → 維持銷售節奏
```

**KPI 監控**：
- 新鮮期售出率 ≥ 80%（目標：90%）
- 保鮮期售出率 ≥ 60%（目標：75%）
- 展示期滯銷率 ≤ 10%（目標：5%）
- 各通路回轉天數：Direct ≤2天、LINE ≤3天、Phone ≤4天、Wholesale ≤7天

### 4. **季節性需求管理**

**水果季節週期**（見《生產銷售行事曆》）：
```
水蜜桃：6-9月   | 盛產期：7-8月
蜜蘋果：9-12月  | 盛產期：10-11月
柿子：  10-1月  | 盛產期：11-12月
梨子：  8-11月  | 盛產期：9-10月
```

**策略執行**：
- **盛產季**（6-11月）：新鮮品優先、直接銷售、庫容最大化
- **淡季**（2-5月）：依靠冷藏庫存、清倉促銷、規劃採購
- **過渡月**（12月、1月）：聖誕檔期、新年禮盒、跨季組合包

### 5. **訂單優先行銷對象（加權 RFM）**

在訂單管理頁面，針對促銷品項推薦最適合的客戶群，採用**加權 RFM 公式**：

```
加權 RFM 分數 = 0.4 × R分 + 0.3 × F分 + 0.3 × M分

權重說明：
- R（近期性）：40% - 最近購買的客戶回購機率最高
- F（頻率）：  30% - 高頻客戶對促銷敏感度高
- M（金額）：  30% - 高消費客戶價值大

分數範圍：1.0 - 5.0 分
推薦門檻：≥ 3.5 分（建議優先聯繫）

排序邏輯：
1) 加權分數由高到低
2) 同分時，R分高者優先（近期客戶更容易回購）
3) 顯示前 10 名建議客戶
```

**應用場景**：
- 新品上市：推薦給高頻且近期活躍客戶
- 限時促銷：推薦給 VIP 與 Stable 客戶
- 清倉活動：推薦給所有≥3.5分客戶

### 6. **地塊健康度計算**

**公式**：
```
基礎分數：
- Active（運作中）：      80 分
- Maintenance（維護中）： 60 分
- Fallow（休耕）：        40 分

作業加分（7天內，每項限計一次）：
+ 施肥（Fertilize）：  +5 分
+ 修剪（Pruning）：    +4 分
+ 噴藥（Pesticide）：  +3 分
+ 套袋（Bagging）：    +3 分
+ 除草（Weeding）：    +2 分
+ 採收（Harvest）：    +2 分

時效衰減：
- 30-60 天未作業：     -5 分
- >60 天未作業：       -15 分

成本效益調整：
- 近30天總成本<500：   -3 分（投入不足）
- 近30天總成本>2000 且健康度<70：-5 分（高投入低產出）

季節匹配度：
- 錯季種植（如冬季種夏季水果）：-5 分

最終分數：限制在 0-100 分之間
```

**決策邏輯**：
```
健康度 ≥ 85：✓ 健康良好
  → 維持每7天巡檢、觀測病蟲害
  → 預防性維護、保持現狀

健康度 60-84：⚠ 中度注意
  → 建議施肥或葉面追肥
  → 加強病蟲監測
  → 檢查灌溉均勻性

健康度 < 60：🚨 優先處理
  → 修剪病枝
  → 檢查排水/灌溉系統
  → 必要時施藥或補苗
```

### 7. **優先促銷品項計算**

在訂單管理頁面自動識別需要優先推銷的庫存品項：

```
計算規則：

agingDays = (今天 - harvest_date) / (1000 * 60 * 60 * 24)

優先促銷條件（滿足任一即列入）：
1. agingDays > 10 天 且 quantity > 50  （即將過期+高庫存）
2. agingDays > 7 天 且 quantity > 100  （保鮮期+超高庫存）
3. grade = 'C' 且 quantity > 80         （C級品+高庫存）

排序規則：
1) agingDays 由高到低（越接近過期越優先）
2) quantity 由高到低（庫存越多越需要清）
3) grade 排序：C > B > A（低等級優先）

顯示資訊：
- 品項名稱、等級、庫存數量
- 採收天數（agingDays）
- 建議動作：
  • agingDays > 14：立即清倉或加工
  • agingDays 10-14：組合促銷、批發優惠
  • agingDays 7-10：限時促銷、會員優惠
```

---

## 🌟 系統特色

### 🎯 四大核心價值

| 特色 | 說明 | 預期效益 |
|------|------|--------|
| **決策智能化** | 即時決策建議卡片 + 季節行事曆 | 決策速度 ↑50% |
| **庫存最優化** | 多位置、多品級、季節性管理 | 庫容利用率 ↑40%、缺貨率 ↓30% |
| **客戶分層化** | RFM 自動分級 + 分段策略 | 客單價 ↑、留存率 ↑25% |
| **流程自動化** | 訂單→揀貨→庫存一體化 | 處理速度 ↑3 倍、錯誤率 ↓95% |

### ⚙️ 技術棧優勢

- **前端**：React 19 + TypeScript + Vite（秒級開發熱更新）
- **後端**：Express + Serverless（Vercel）+ 直連 Supabase（避免 SDK 冷啟動）
- **資料庫**：PostgreSQL（Supabase 託管）+ 自動 camelCase ↔ snake_case 轉換
- **UI**：TailwindCSS + Recharts（響應式 + 可視化）
- **AI**：Google Gemini（可選，已預留介面）

### 📊 數據驅動

- 完整的 KPI 監控指標（13 個）
- 決策矩陣與流程圖文檔
- 所有建議都有理論依據
- 支持後續 ML 預測集成

---

## 🚀 本地部署指南

### 前置需求

- Node.js 18+
- Supabase 帳號（**必須配置**，系統依賴 Supabase 作為主要資料庫）
- Google Gemini API Key（AI 功能可選）

### 本地開發設定

#### 1. Clone 專案並安裝依賴

```bash
git clone https://github.com/Jaa-ack/FruitOPS.git
## ✨ 核心功能

### 📊 決策與分析
- 🧠 **決策建議分頁化**：Dashboard 保留圖表與季節提示；Inventory/Orders/Production 各自呈現時效、促銷、AI 建議
- 📅 **生產銷售行事曆**：可視化水果季節週期（春/夏/秋/冬），按優先度分層推薦
- 👥 **RFM 客戶分級**：Recency/Frequency/Monetary 自動分段（VIP/Stable/Regular/New/AtRisk）
- 📈 **銷售通路分析**：多通路數據彙總與績效對比
- 🌡️ **作物健康評分**：地塊健康度追蹤與預防性農業建議

### 🎯 業務流程
- 🌳 **果園管理**：地塊資訊、作物健康追蹤、農事日誌、季節性農務規劃
- 📦 **分級庫存**：多位置、多品級、入庫/移位/刪除，入庫支援 `harvest_date`、`package_spec`、`batch_id`、`origin_plot_id`；依採收日期自動生成時效分期與通路配置建議
- 🛒 **訂單管理**：快速建單（含 `source`、`payment_status`、品項 `origin_plot_id`）、揀貨扣庫存、狀態流轉（Pending/Confirmed/Shipped/Completed）
- 📬 **客戶管理**：CRM + RFM 分級，客戶卡與檔案可編輯姓名/電話/分級/`region`/`preferred_channel`
- 📅 **生產銷售行事曆**：季節性供應與策略摘要

### 🤖 智能輔助
- 🧠 **AI 顧問**：Google Gemini 實時回答（庫存分析、銷售建議、成本優化、簡訊撰寫）
- 🔔 **全局通知**：Toast 系統通知所有表單操作（新增、更新、錯誤提示）

---

## 🛠 使用手冊（依頁面）
# AI 服務（可選，未設定時 AI 功能不可用）
GEMINI_API_KEY=your_gemini_api_key

# 進階設定（通常不需調整）
# API_TIMEOUT_MS=12000              # API 請求逾時（毫秒）
# AI_TIMEOUT_MS=10000               # AI 請求逾時（毫秒）
# SUPABASE_FETCH_TIMEOUT_MS=5000    # Supabase fetch 逾時（毫秒）
# DISABLE_LOCAL_DB=0                # 設為 1 時禁用本地 lowdb fallback（生產環境建議啟用）
# SUPABASE_FORCE_LOCAL=0            # 設為 1 時強制使用本地資料庫（僅供測試）
```

#### 4. 啟動應用

**方式 1：使用 npm script（推薦）**

```bash
# 同時啟動前後端（會先 kill port 4000）
npm run dev:all
```

**方式 2：手動載入環境變數（適用於 shell script）**

```bash
# 載入 server/.env 中的環境變數（zsh/bash）
set -a
source server/.env
set +a

# 然後啟動
npm run dev:all
```

**方式 3：分開啟動**

```bash
npm run dev         # 前端 (port 3000)
npm run dev:server  # 後端 (port 4000)
```

#### 5. 開啟瀏覽器

前往 http://localhost:3000 開始使用！

---

## 📦 技術架構

### 前端技術棧
- React 19 + TypeScript
- Vite（開發工具）
- TailwindCSS（UI 設計）
- Recharts（圖表視覺化）
- React Router（路由）

### 後端技術棧
- Node.js + Express（在 Vercel 以 Serverless Function 執行）
- Supabase（PostgreSQL + PostgREST）— 已改為「直接 REST 客戶端」，避免 SDK 冷啟動延遲
- Google Gemini AI（可選）
- 逾時與健康檢查：`/api/healthz`、明確超時處理

## 📁 專案結構

```
FruitOPS/
├── components/              # React 元件
│   ├── Dashboard.tsx        # 儀表板
│   ├── Production.tsx       # 果園管理
│   ├── Inventory.tsx        # 庫存管理
│   ├── Orders.tsx           # 訂單管理
│   ├── CRM.tsx              # 客戶管理
│   └── GeminiAdvisor.tsx    # AI 顧問
├── server/                  # 後端服務
│   ├── index.js             # Express 主程式
│   ├── supabase-direct.js   # 直連 Supabase REST（內建 camel/snake 轉換、POST/PATCH Prefer header）
│   ├── migrations/          # SQL 遷移檔案
│   │   └── 002_rebuild_with_sample_data.sql
│   └── .env                 # 環境變數（需自行建立）
├── services/
│   └── api.ts               # 前端 API 客戶端
├── App.tsx                  # 主應用元件
├── package.json             # 前端依賴
└── README.md                # 本文件
```

## 🎯 開發指令

```bash
# 開發
npm run dev              # 啟動前端開發伺服器
npm run dev:server       # 啟動後端伺服器
npm run dev:all          # 同時啟動前後端
npm run dev:kill         # 清理 port 4000

# 建置
npm run build            # 建置生產版本
npm run preview          # 預覽建置結果

# 資料庫
./rebuild_db.sh          # 重建資料庫（需設定 DATABASE_URL）
```

## 🧭 操作重點

- **分級庫存新增**：庫存頁點「新增庫存」，先選產品→自動載入可用等級，指定儲位與數量後送出會寫入 `/api/inventory-v2`。
- **庫存移位**：展開庫存品項後點鉛筆，輸入數量與目標儲位，後端呼叫 `/api/inventory-move` 做扣/加總，同時驗證數量與位置。
- **訂單建立**：訂單頁「快速新增訂單」支援多品項，總額會自動加總，送出寫入 `/api/orders`。
- **訂單揀貨與確認**：訂單行點「揀貨/扣庫存」，每個品項需選擇來源儲位且數量必須與需求完全相同，成功後 `/api/orders/:id/pick` 會扣庫存並將訂單狀態改為 Confirmed。

---

## ✅ 本階段修正與驗收重點

以下項目均已完成並在程式中落實：

1) 行事曆標題改為「欣欣果園」
2) 冬季順序調整為「12 月 → 1 月」（置左）
3) 移除行事曆圖例說明（簡化 UI）
4) 行事曆「系統建議依據」已加註（`MONTH_INFO.priority` 與 `peakMonths`）
5) 「庫存管理細節建議」已移至分級庫存頁並加註依據（<50、>200）
6) 智慧生產頁底部加入「健康度與決策邏輯說明」
7) 訂單表格第一欄為「訂單日期」，格式 `yyyy/MM/dd HH:mm`
8) 新增訂單若為新客，後端自動建立顧客（CRM 可見，含本地/Supabase）
9) CRM 顧客檔案可編輯姓名/電話/分級（`PUT /api/customers/:id`）
10) CRM 移除 RFM 解說與快速分級，下放到顧客設定
11) 顧客近期消費日期統一 `yyyy/MM/dd HH:mm`
12) 分級顯示與資料庫一致，包含 `Regular`（一般客戶）
13) 修復套用分群：Supabase 改逐筆 PATCH，避免 REST 批量限制

---

## 🧪 驗收建議（本地）

```bash
# 1) 檢查型別與建置（macOS zsh）
npm run build

# 2) 啟動後端（需 .env 已設定 Supabase）
cd server
npm run start   # 或 npm run dev:server（根據 package 腳本）

# 3) 啟動前端
cd ..
npm run dev
```

驗收步驟：
- Calendar：確認「欣欣果園」標題、冬季 12→1、系統建議依據段落
- Inventory：看到決策細節與依據顯示；試新增/移位
- Orders：新增一筆使用新客戶姓名的訂單；表格第一欄為訂單日期
- CRM：剛新增的新客戶可見；進入客戶檔案→編輯分級；近期消費日期格式正確
- Segmentation：計算後「應用分級」可成功（不再報錯）

---

## ⚠️ 已知限制與後續計畫

- 批量分群在 Supabase REST 需逐筆 PATCH，已處理；如要提升效率可改用 RPC 或批次 SQL
- 訂單日期欄位依賴 `created_at`（Supabase）或本地 `date`（ISO）；若歷史資料缺欄位需補齊
- 客戶編輯目前在彈窗就地更新選中客戶卡片，如需全列表即時同步可加上全域刷新或 SWR
- AI 顧問僅在提供 API Key 時啟用；可擴充為決策卡自動化產生

---

## ♻️ 庫存決策重構：通路配置與時效管理

考量「收穫受天氣影響、不可精準補貨」的本質，庫存策略從「補貨/缺貨」轉為「通路配置 + 時效管理」。以下為新準則與依據：

- 基本原則
   - 以當月可生產/可供應水果（見《生產銷售行事曆》）為主體，規劃銷售通路份額。
   - 依品級與採收時間（`harvest_date`），管理「新鮮期 → 保鮮期 → 陳列期」動作，避免過期與滯銷。

- 期間定義（可依水果/等級微調）
   - 新鮮期：採收後短期（例：A 級 5–7 天、B 級 3–5 天、C 級 1–3 天）主打直售與高回轉通路。
   - 保鮮期：冷藏可維持的中期（依實務設定），主打批發/通路合作與組合包。
   - 陳列期：臨界或超期庫存（agingDays 超過門檻），立即轉促銷/清倉方案。

- 通路配置建議（對應系統通路：Direct / Line / Phone / Wholesale）
   - 新鮮期：Direct、Line（高回轉）；搭配 VIP Phone 預購（CRM 標記 VIP）
   - 保鮮期：Wholesale 與組合販售（降價提升周轉）
   - 陳列期：限時促銷、清倉包、二次加工（果醬/烘乾），優先 Wholesale

- 時效與動作（以 `harvest_date` 推算 agingDays）
   - agingDays = 今天 − 採收日；超過新鮮期→轉保鮮期策略；超過保鮮期→轉陳列期策略。
   - 當月非盛產水果：減少直售比重、提高通路合作與組合包比重。

- 優先級排序（每週滾動執行）
   1) 新鮮期即將到期（agingDays 接近門檻）的 A/B 級：立即推高回轉通路與 VIP 預購。
   2) 保鮮期中高庫存：安排批發與組合促銷，設定期限。
   3) 陳列期：清倉或加工（建立出清名單）。

- KPI 與監控
   - 期內售出率（Fresh/保鮮/陳列各期）
   - Aging 超期件數（按水果/等級）
   - 通路回轉率（Direct/Line/Phone/Wholesale）
   - 期末滯銷占比（需清倉/加工）

實作銜接（現況）
   - 《行事曆》提供當月水果可得性；《庫存頁》已有採收日期欄位與品級資料。
   - 下一步可在 `Inventory.tsx` 增加 agingDays 計算與「通路配置建議卡」；現階段先以此 README 為準則執行營運。

---

## 📊 資料庫與 API 說明

### 核心資料表

| 表名 | 說明 | 主要欄位 |
|------|------|---------|
| `plots` | 果園地塊 | id, name, crop, area_ha, status, health |
| `logs` | 農事日誌 | id, date, plot_id, activity, crop_type, cost, worker |
| `inventory` | 庫存 | id, product_name, grade, quantity, location_id, harvest_date |
| `orders` | 訂單 | id, order_code, customer_id, customer_name, status, total |
| `order_items` | 訂單項目 | id, order_id, product_name, grade, quantity, price |
| `customers` | 客戶 | id, name, phone, segment, total_spent |
| `product_grades` | 品級配置 | id, product_name, grades[] |
| `storage_locations` | 儲位 | id, name, type, capacity |

### 主要 API 對照（部分）

- `GET /api/inventory-summary` / `GET /api/inventory-detail`：多位置庫存摘要與明細。
- `POST /api/inventory-v2`：新增/更新庫存，支援同品項多位置。
- `POST /api/inventory-move`：庫存移位（扣來源、加目標）。
- `POST /api/orders`：建立訂單（多品項）。
- `POST /api/orders/:id/pick`：揀貨扣庫存並更新訂單狀態。

### 自動欄位轉換（camelCase ↔ snake_case）

資料庫使用 **snake_case**（PostgreSQL 標準），前端使用 **camelCase**。轉換層自動處理，無需手動轉換：

```javascript
// 前端發送 (camelCase)
{ customerName: "王大明", productName: "水蜜桃" }
    ↓ 自動轉換 ↓
// 資料庫儲存 (snake_case)  
{ customer_name: "王大明", product_name: "水蜜桃" }
```

## 🍎 水果品級設定

系統預設 4 種水果品級配置（可在 `product_grades` 表自訂）：

| 水果 | 等級 |
|------|------|
| 水梨 | A, B, C |
| 水蜜桃 | A, B, C |
| 蜜蘋果 | A, B, C |
| 柿子 | A, B（只有兩級）|

前端訂單介面會動態載入品級選項，依水果顯示對應等級。

---

## 🚀 部署到 Vercel

### 環境設定

Vercel 會直接注入環境變數，請在 Vercel Dashboard → Project Settings → Environment Variables 設定以下變數（Scope 選擇 **Production, Preview, Development**）：

**必須設定：**
- `SUPABASE_URL` - Supabase 專案 URL
- `SUPABASE_SERVICE_KEY` - Supabase Service Role Key（請勿使用 anon key）
- `DISABLE_LOCAL_DB` - 設為 `1`（生產環境禁用本地 fallback，確保所有請求走 Supabase）

**可選設定：**
- `GEMINI_API_KEY` - Google Gemini API Key（AI 功能）
- `API_TIMEOUT_MS` - API 請求逾時（預設 12000 毫秒）
- `AI_TIMEOUT_MS` - AI 請求逾時（預設 10000 毫秒）
- `SUPABASE_FETCH_TIMEOUT_MS` - Supabase fetch 逾時（預設 5000 毫秒）

### 部署步驟

1. **Fork 專案**  
   Fork 此專案到你的 GitHub 帳號

2. **連接 Vercel**  
   前往 [Vercel Dashboard](https://vercel.com) → Import Project → 選擇 FruitOPS repository

3. **設定環境變數**  
   依照上述列表在 Environment Variables 頁面新增所有必須與可選的環境變數

4. **部署**  
   點擊 Deploy，Vercel 會自動建置並部署（建置時間約 1-2 分鐘）

5. **驗證部署**  
   部署完成後，前往 `https://your-project.vercel.app/api/healthz` 確認 API 正常運作（應回應 `{"status":"ok"}`）

6. **測試功能**  
   登入前端，測試新增訂單、庫存、日誌等功能確保 Supabase 連線正常

### 架構說明（Vercel）

- 前端：Vite 建置為靜態檔案，部署於 Vercel CDN
- 後端：Express 透過 `serverless-http` 包裝為 Vercel Serverless Function（`api/index.cjs`）
- 資料庫：所有資料存於 Supabase（PostgreSQL），透過 `server/supabase.js` 存取
- Health Check：`/api/healthz` 直接回應，不載入整個 Express app，確保快速回應

## 📚 參考資源

- [Supabase 官方文件](https://supabase.com/docs) - Supabase 資料庫與 API 設定
- [Vercel 部署指南](https://vercel.com/docs) - Serverless 部署最佳實踐
- [Google Gemini API](https://ai.google.dev/docs) - AI 功能整合說明

## 🔐 安全提醒

### 開發流程
1. Fork 此專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. Commit 你的變更 (`git commit -m 'Add some AmazingFeature'`)
4. Push 到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 檔案

## 👨‍💻 作者

**Jaa-ack**
- GitHub: [@Jaa-ack](https://github.com/Jaa-ack)
- 專案連結: [https://github.com/Jaa-ack/FruitOPS](https://github.com/Jaa-ack/FruitOPS)

---

⭐ 如果這個專案對你有幫助，請給個 Star！

**需要協助？** 查看 [DB_REBUILD_GUIDE.md](./DB_REBUILD_GUIDE.md) 或提交 Issue。

# Redeploy trigger
