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

快速開始無需本地部署，登入後即可體驗完整功能。

---

## ✨ 核心功能

### 📊 決策與分析
- 🧠 **今日決策建議** - 首頁頂部即時可操作建議（補貨、訂單優先、儲位調整、銷售推進）
- 📅 **生產銷售行事曆** - 可視化水果季節週期（春/夏/秋/冬），按優先度分層推薦
- 👥 **RFM 客戶分級** - Recency/Frequency/Monetary 自動分段（VIP/Stable/Regular/New/AtRisk）
- 📈 **銷售通路分析** - 多通路數據彙總與績效對比
- 🌡️ **作物健康評分** - 地塊健康度追蹤與預防性農業建議

### 🎯 業務流程
- 🌳 **果園管理** - 地塊資訊、作物健康追蹤、農事日誌、季節性農務規劃
- 📝 **農事日誌** - 快速記錄活動、成本、工時，支援按日期/地塊過濾
- 📦 **分級庫存** - 多位置、多品級庫存管理，支援移位、彙總、賞味期追蹤
- 🛒 **訂單管理** - 快速建單、揀貨、扣庫存、狀態流轉（Pending/Confirmed/Completed）
- 📬 **客戶管理** - CRM 管理、RFM 分級、季節性客戶推薦、分段行銷

### 🤖 智能輔助
- 🧠 **AI 顧問** - Google Gemini 實時回答（庫存分析、銷售建議、成本優化、簡訊撰寫）
- 🔔 **全局通知** - Toast 系統通知所有表單操作（新增、更新、錯誤提示）

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
- 「庫存決策細節建議」：
   - 依據：低庫存 <50，高庫存 >200；平均=總量/品項數
   - 顯示低/高存項與補貨建議，供倉儲與採購決策

### 4) 訂單管理
- 快速新增訂單（多品項，依水果動態載入品級）
- 新訂單若使用新客戶姓名，系統會自動建立該客戶（CRM 可見）
- 揀貨流程需為每項品項指定來源儲位且數量與需求一致，成功即扣庫存並更新狀態
- 表格第一欄為「訂單日期」，顯示格式 `yyyy/MM/dd HH:mm`

### 5) CRM 客戶管理
- 客戶卡片提供基本資訊與分群；點擊可打開客戶檔案彈窗
- 檔案內可「編輯」姓名/電話/分級（保存後即寫入後端）
- 近期消費「日期顯示為 `yyyy/MM/dd HH:mm`」
- 介面已移除 RFM 說明卡與「快速調整分級」；分級調整改於顧客設定中進行

## 📊 分析方法論

系統應用多個經營管理理論確保決策有據可依：

### 1. **RFM 客戶分級法**
- **Recency（近期性）**：上次購買距今天數 ≤60/≤90/≤180 天
- **Frequency（購買頻率）**：累計購買次數 ≥5/≥3/>0 次  
- **Monetary（消費金額）**：生涯總消費 ≥$100k/≥$50k/任意

**分級策略**：
- 🟣 **VIP**：三維度皆高→推送預購、高端禮盒、客製化服務
- 🔵 **Stable**：兩維度高→定期優惠、新品搶先看
- ⚪ **Regular**：基本達成→保持互動、提升回購
- 🟢 **New**：首購客→首購折扣、產品推薦
- 🔴 **At Risk**：購買中斷→聯繫挽回、回購優惠

### 2. **庫存 ABC 分類法**
- **A 級**：高價值、低數量、重點監控
- **B 級**：中等價值、中等數量、定期調整
- **C 級**：低價值、高數量、統一管理

**應用**：按品級別分配冷藏優先度、促銷策略不同

### 3. **季節性需求管理**
- **盛產季**（6-11月）：新鮮水果優先、降價促銷、庫容最大化
- **淡季**（2-5月）：依靠冷藏庫存、清倉優惠、規劃採購
- **過渡月**（12月、1月）：聖誕檔期、新年禮品、跨季組合

**水果週期**：
- 水蜜桃：6-9月 | 水梨：8-11月 | 蜜蘋果：9-12月 | 柿子：10-1月

### 4. **經濟訂購量（EOQ）**
- 最小化訂購成本 + 持有成本
- 結合季節需求預測補貨時機
- 避免缺貨與過庫的平衡

### 5. **預防性農業管理**
- **健康度 ≥85**：維持巡檢、觀測病蟲（預防）
- **健康度 60-85**：主動介入、施肥監測（改善）
- **健康度 <60**：緊急響應、修剪施藥（救援）

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
cd FruitOPS
npm install
cd server && npm install && cd ..
```

#### 2. 設定 Supabase 資料庫

a. **建立 Supabase 專案**
   - 前往 [Supabase Dashboard](https://app.supabase.com)
   - 建立新專案（選擇區域、設定密碼）

b. **取得連線資訊**
   - 進入 Project Settings → API
   - 複製 `URL` 和 `service_role key`（請妥善保管此密鑰）

c. **執行資料庫遷移**
   - 進入 SQL Editor
   - 點選 "New Query"
   - 複製 `server/migrations/002_rebuild_with_sample_data.sql`（含多位置庫存/訂單項目）完整內容
   - 貼上並執行（點 Run）
   - 看到 ✅ 成功訊息即完成

#### 3. 設定環境變數

在 `server/` 目錄建立 `.env` 檔案：

```env
# Supabase 設定（必須）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

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
