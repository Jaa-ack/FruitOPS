# 🍎 FruitOPS - 果園管理系統

完整的果園營運管理系統，支援果園地塊管理、農事日誌、庫存追蹤與訂單管理。

![FruitOPS Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## ✨ 功能特色

- 📊 **儀表板** - 營運數據總覽、收入趨勢分析
- 🌳 **果園管理** - 地塊資訊、作物健康追蹤
- 📝 **農事日誌** - 完整記錄所有農事活動與成本
- 📦 **庫存管理** - 多位置、多品級庫存即時追蹤，支援庫存移位
- 🛒 **訂單管理** - 客戶訂單、揀貨/扣庫存與狀態追蹤
- 👥 **客戶關係** - CRM 功能、客戶分級管理
- 🤖 **AI 顧問** - Google Gemini 支援的智能建議

## 🚀 快速開始

### 前置需求

- Node.js 18+
- Supabase 帳號（免費方案即可）
- Google AI API Key（AI 功能可選）

### 安裝步驟

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
   - 複製 `URL` 和 `service_role key`

c. **執行資料庫遷移**
   - 進入 SQL Editor
   - 點選 "New Query"
   - 複製 `server/migrations/002_rebuild_with_sample_data.sql`（含多位置庫存/訂單項目）完整內容
   - 貼上並執行（點 Run）
   - 看到 ✅ 成功訊息即完成

#### 3. 設定環境變數

在 `server/` 目錄建立 `.env` 檔案：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key  # 可選
```

#### 4. 啟動應用

```bash
# 方式 1：同時啟動前後端
npm run dev:all

# 方式 2：分開啟動
npm run dev         # 前端 (port 3000)
npm run dev:server  # 後端 (port 4000)
```

#### 5. 開啟瀏覽器

前往 http://localhost:3000 開始使用！

## 📦 技術架構

### 前端技術棧
- React 19 + TypeScript
- Vite（開發工具）
- TailwindCSS（UI 設計）
- Recharts（圖表視覺化）
- React Router（路由）

### 後端技術棧
- Node.js + Express
- Supabase（PostgreSQL + PostgREST）
- lowdb（本地備援）
- Google Gemini AI

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
│   ├── supabase.js          # 資料層（含自動轉換）
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
- **本地備援模式**：未設定 Supabase 時，後端自動使用 `server/db.json`（lowdb）存取 plots/logs/inventory/orders/customers，方便離線開發與測試。

## 📊 資料庫說明

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

### 主要 API 對照

- `GET /api/inventory-summary` / `GET /api/inventory-detail`：多位置庫存摘要與明細。
- `POST /api/inventory-v2`：新增/更新庫存，支援同品項多位置。
- `POST /api/inventory-move`：庫存移位（扣來源、加目標）。
- `POST /api/orders`：建立訂單（多品項）。
- `POST /api/orders/:id/pick`：揀貨扣庫存並更新訂單狀態。

### 自動欄位轉換

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

## 🚀 部署到生產環境

### Vercel（推薦）

1. Fork 此專案到你的 GitHub
2. 進入 [Vercel Dashboard](https://vercel.com)
3. Import 你的 repository
4. 設定環境變數（同 `.env` 內容）
5. 部署完成！

### 其他平台

需要設定以下環境變數：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`（可選）

## 🆘 常見問題

### Q: 訂單無法建立（PGRST204 錯誤）
**A:** 
- 確認資料庫 SQL 遷移已執行
- 檢查後端運行：`curl http://localhost:4000/api/healthz`
- 查看後端終端的錯誤訊息

### Q: 品級選項不顯示
**A:**
- 確認 `product_grades` 表有資料
- 測試 API：`curl http://localhost:4000/api/product-grades`
- 開啟瀏覽器 DevTools → Network 查看請求

### Q: Port 4000 已被占用
**A:**
```bash
npm run dev:kill  # 自動清理
# 或手動清理
lsof -ti:4000 | xargs kill -9
```

### Q: 新增日誌失敗
**A:** 
- 確認已執行最新的 SQL 遷移
- 檢查 `plots` 表有對應的 `plot_id`
- 查看後端日誌確認錯誤詳情

### Q: 資料庫連線失敗
**A:**
- 確認 `.env` 在 `server/` 目錄下
- 驗證 SUPABASE_URL 和 SUPABASE_SERVICE_KEY 正確
- 確認 Supabase 專案狀態正常（沒有暫停）

## 📚 相關文檔

- [資料庫重建指南](./DB_REBUILD_GUIDE.md) - 詳細的資料庫設定說明
- [快速參考](./QUICK_START.md) - 常用指令與快速查詢
- [重建說明](./README_REBUILD.md) - 從頭建立專案的步驟

## 🔐 安全提醒

⚠️ **重要：保護你的密鑰**

- 永遠不要將 `.env` 檔案 commit 到 Git
- 使用 `SUPABASE_SERVICE_KEY` 時需特別小心（具有完整權限）
- 生產環境建議使用 Supabase RLS（Row Level Security）
- 部署時使用平台的 Environment Variables 功能

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

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

