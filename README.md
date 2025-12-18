# 🍎 FruitOPS - 果園管理系統

完整的果園營運管理系統，支援果園地塊管理、農事日誌、分級庫存與訂單管理，並提供決策建議與 AI 顧問。

線上展示（Vercel 部署）：https://fruit-ops.vercel.app

## ✨ 功能特色

- 🧠 **今日決策建議** - 首頁頂部提供可操作建議（補貨、訂單優先、儲位調整、銷售推進），一進來就知道該做什麼
- 📊 **儀表板** - 通路分佈、庫存水位圖、庫存管理細節建議
- 🌳 **果園管理** - 地塊資訊、作物健康追蹤、農事日誌
- 📝 **農事日誌** - 記錄活動、成本、工時，快速新增與查詢
- 📦 **分級庫存** - 多位置、多品級庫存管理，支援移位、彙總
- 🛒 **訂單管理** - 建單、揀貨扣庫存、狀態流轉（Pending/Confirmed/Completed）
- 👥 **客戶關係** - CRM 與客戶分群
- 🤖 **AI 顧問** - Google Gemini 智能回答（可選）

---

## 🚀 快速開始

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
