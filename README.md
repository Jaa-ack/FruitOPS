# 🍎 FruitOPS - 智能果園管理系統

完整的果園營運管理系統，整合季節性決策、RFM 客戶分級、實時庫存管理、訂單流程自動化，搭配 AI 顧問提供智能決策建議。

[![部署到 Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Jaa-ack/FruitOPS)

---

## 🌐 線上試用

📱 **Vercel 部署版本**：[https://fruit-ops.vercel.app](https://fruit-ops.vercel.app)

---

## ✨ 核心功能

### 📊 決策與分析
- 🧠 **決策建議分頁化**：Dashboard 保留圖表與季節提示；Inventory/Orders/Production 各自呈現時效、促銷、AI 建議
- 📅 **生產銷售行事曆**：可視化水果季節週期（春/夏/秋/冬），按優先度分層推薦
- 👥 **RFM 客戶分級**：Recency/Frequency/Monetary 自動分段（VIP/Stable/Regular/New/AtRisk）
- 📊 **精準銷售指標**：本月銷售額僅計算已完成訂單（排除 Pending/Cancelled）、銷售量顯示完成訂單數
- 📈 **銷售通路分析**：多通路數據彙總與績效對比
- 🌡️ **作物健康評分**：地塊健康度追蹤與預防性農業建議
- 👑 **VIP 客戶管理**：自動從資料庫 segment 欄位識別 VIP，顯示消費金額與最近訂單時間

### 🎯 業務流程
- 🌳 **果園管理**：地塊資訊、作物健康追蹤、農事日誌、季節性農務規劃
- 📦 **分級庫存**：多位置、多品級、入庫/移位/刪除，依採收日期自動生成時效分期與通路配置建議
- 🛒 **訂單管理**：快速建單（含多品項）、揀貨扣庫存、狀態流轉（Pending→Confirmed→Shipped→Completed）
- 📬 **客戶管理**：CRM + RFM 分級，客戶檔案可編輯分級與基本資料
- 📅 **生產銷售行事曆**：季節性供應與策略摘要

### 🤖 智能輔助
- 🧠 **AI 顧問**：Google Gemini 實時回答（庫存分析、銷售建議、成本優化、簡訊撰寫）
- 🔔 **全局通知**：Toast 系統通知所有表單操作（新增、更新、錯誤提示）

---

## 📊 策略方法論

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

**VIP 客戶識別**：系統自動從資料庫 `customers.segment` 欄位識別 VIP 客戶，Dashboard 顯示：
- VIP 客戶數量統計
- 前 5 位 VIP 客戶動態（按最近訂單日期或總消費排序）
- 每位 VIP 顯示：姓名、總消費金額、最近訂單天數

**高消費客戶範例**（系統已預設三位總消費 ≥ $10,000 的客戶）：
- **王阿強**：總消費超過 $11,000（VIP 客戶，電話通路）
- **張三**：總消費超過 $12,000（批發大客戶）
- **鄭十一**：總消費超過 $11,000（VIP 客戶，LINE 通路）

---

### 2. **Dashboard 銷售指標計算邏輯**

為確保數據準確性，Dashboard 的關鍵指標採用以下計算邏輯：

**本月銷售額**：
```typescript
// 只計算已完成訂單的金額總額
const monthlyOrders = orders.filter(o => {
  const d = parseDate(o.date);
  return d && 
         d.getMonth() + 1 === currentMonth && 
         d.getFullYear() === currentYear && 
         o.status === 'Completed';  // 關鍵：只計算已完成
});

const monthlyRevenue = monthlyOrders.reduce(
  (acc, curr) => acc + Number(curr.total), 0
);
```

**本月銷售量**：
```typescript
// 顯示已完成訂單的數量（而非產品件數）
銷售量 = monthlyOrders.length

// 顯示格式：「產量(件) / 完成訂單數」
// 例如：1650 / 15（表示產出1650件水果，完成15筆訂單）
```

**為何採用此邏輯**：
- ❌ Pending 訂單：尚未確認，不應計入收入
- ❌ Cancelled 訂單：已取消，不產生收入
- ✅ Completed 訂單：已確認、已出貨、已收款，真實反映營收

**業務意義**：
- 本月銷售額：實際入帳金額，財務報表基礎
- 完成訂單數：服務效率指標，反映訂單處理能力
- 產銷比：產量 vs 訂單數，評估銷售效率與庫存周轉

---

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

---

### 4. **訂單優先行銷對象（加權 RFM）**

在訂單管理頁面，針對促銷品項推薦最適合的客戶群，採用**加權 RFM 公式**：

```
加權 RFM 分數 = 0.4 × R分 + 0.3 × F分 + 0.3 × M分

權重說明：
- R（近期性）：40% - 最近購買的客戶回購機率最高
- F（頻率）：  30% - 高頻客戶對促銷敏感度高
- M（金額）：  30% - 高消費客戶價值大

分數範圍：1.0 - 5.0 分
推薦門檻：≥ 3.5 分（建議優先聯絡）

排序邏輯：
1) 加權分數由高到低
2) 同分時，R分高者優先（近期客戶更容易回購）
3) 顯示前 10 名建議客戶
```

**應用場景**：
- 新品上市：推薦給高頻且近期活躍客戶
- 限時促銷：推薦給 VIP 與 Stable 客戶
- 清倉活動：推薦給所有≥3.5分客戶

---

### 5. **優先促銷品項計算**

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

---

### 7. **季節性需求管理**

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

---

## 🚀 本地部署指南

### 前置需求

- Node.js 18+
- Supabase 帳號（**必須配置**，系統依賴 Supabase 作為主要資料庫）
- Google Gemini API Key（AI 功能可選）

### 快速開始

#### 1. Clone 專案並安裝依賴

```bash
git clone https://github.com/Jaa-ack/FruitOPS.git
cd FruitOPS
npm install
cd server && npm install && cd ..
```

#### 2. 設定 Supabase 資料庫

**取得 Supabase 連線資訊**：
1. 前往 [Supabase Dashboard](https://app.supabase.com)
2. 選擇或建立專案
3. 前往 Settings → API
4. 複製以下資訊：
   - `Project URL`（SUPABASE_URL）
   - `service_role key`（SUPABASE_SERVICE_KEY）⚠️ 注意：使用 service_role 而非 anon key

**執行資料庫遷移**：
1. 前往 Supabase SQL Editor
2. 執行 `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
3. 複製並執行 `server/migrations/007_recreate_schema_and_seed_full.sql` 全部內容
4. 驗證資料表已建立：
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

#### 3. 設定環境變數

在專案**根目錄**建立 `.env` 檔案：

```bash
# 建立 .env 檔案
cat > .env << 'EOF'
# Supabase 連線（必須）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# AI 服務（可選，未設定時 AI 功能不可用）
GEMINI_API_KEY=your_gemini_api_key

# 進階設定（通常不需調整）
# API_TIMEOUT_MS=40000              # API 請求逾時（毫秒）
# AI_TIMEOUT_MS=30000               # AI 請求逾時（毫秒）
# SUPABASE_FETCH_TIMEOUT_MS=5000    # Supabase fetch 逾時（毫秒）
# DISABLE_LOCAL_DB=0                # 設為 1 時禁用本地 lowdb fallback
EOF
```

**取得 Gemini API Key**（可選）：
1. 前往 [Google AI Studio](https://aistudio.google.com/apikey)
2. 點擊「Create API Key」
3. 複製 API Key 並填入 `.env`

#### 4. 啟動應用

```bash
# 同時啟動前後端（推薦）
npm run dev:all

# 或分開啟動
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
- Node.js + Express
- Vercel Serverless Function（生產環境）
- Supabase（PostgreSQL + PostgREST）
- Direct REST Client（避免 SDK 冷啟動）
- Google Gemini AI（可選）

### 資料庫架構
- PostgreSQL（Supabase 託管）
- 自動 camelCase ↔ snake_case 轉換
- UUID 主鍵 + 自動時間戳記
- 外鍵約束確保資料完整性

---

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
```

---

## 🚀 部署到 Vercel

### 環境變數設定

在 Vercel Dashboard → Project Settings → Environment Variables 設定以下變數：

**必須設定：**
- `SUPABASE_URL` - Supabase 專案 URL
- `SUPABASE_SERVICE_KEY` - Supabase Service Role Key
- `DISABLE_LOCAL_DB` - 設為 `1`（生產環境禁用本地 fallback）

**可選設定：**
- `GEMINI_API_KEY` - Google Gemini API Key（AI 功能）
- `API_TIMEOUT_MS` - API 請求逾時（預設 40000）
- `AI_TIMEOUT_MS` - AI 請求逾時（預設 30000）

### 部署步驟

1. **Fork 專案** → Fork 此專案到你的 GitHub 帳號
2. **連接 Vercel** → [Vercel Dashboard](https://vercel.com) → Import Project
3. **設定環境變數** → 依照上述列表新增所有環境變數
4. **部署** → 點擊 Deploy（建置時間約 1-2 分鐘）
5. **驗證** → 前往 `https://your-project.vercel.app/api/healthz` 確認 API 正常

---

## 🔐 安全提醒

⚠️ **重要：環境變數安全**

1. **切勿將 `.env` 檔案提交到 Git**
   - `.env` 已列在 `.gitignore` 中
   - 如已提交，請立即執行：
     ```bash
     git rm --cached .env
     git commit -m "Remove .env from git tracking"
     git push
     ```
   - 前往 Supabase 重新產生 service_role key

2. **Vercel 環境變數管理**
   - 所有機敏資料應設定在 Vercel Dashboard
   - 不要在程式碼中硬編碼 API Key
   - 使用 `process.env.VARIABLE_NAME` 讀取

3. **API Key 保護**
   - Gemini API Key 應定期輪替
   - 監控 API 使用量避免濫用
   - 設定 API 配額限制

4. **資料庫安全**
   - 使用 service_role key 而非 anon key
   - 啟用 Row Level Security（RLS）
   - 定期備份資料庫

---

## 📚 使用手冊

### 1) 生產銷售行事曆
- 顯示各月水果供應、策略摘要與優先度徽章
- 排序規則：春/夏/秋為月份遞增；冬季固定「12月在1月左側」
- 系統建議依據：`types/fruitCycle.ts` 的 `MONTH_INFO.priority` 與各水果 `peakMonths`

### 2) 智慧生產
- 查看各地塊健康分數、狀態與歷史農事紀錄
- AI 諮詢功能：即時詢問 AI 智慧顧問
- 頁面最下方提供「決策邏輯說明」

### 3) 分級庫存
- 功能：多位置、多品級、入庫、移位、摘要與明細查詢
- 時效決策：依 `harvest_date` 分期，自動給出通路配置與促銷建議
- 表單欄位：`harvest_date`（必填）、`package_spec`、`batch_id`、`origin_plot_id`（選填）

### 4) 訂單管理
- 快速新增訂單（多品項，依水果動態載入品級）
- 揀貨流程：為每項品項指定來源儲位，成功即扣庫存並更新狀態
- 顯示優先促銷品項與推薦客戶（加權 RFM）

### 5) CRM 客戶管理
- 客戶卡片提供基本資訊與分群
- 點擊可打開客戶檔案彈窗編輯資料
- RFM 分級計算與套用功能

---

## 🤝 貢獻指南

### 開發流程
1. Fork 此專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. Commit 你的變更 (`git commit -m 'Add some AmazingFeature'`)
4. Push 到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

---

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 檔案

---

## 👨‍💻 作者

**Jaa-ack**
- GitHub: [@Jaa-ack](https://github.com/Jaa-ack)
- 專案連結: [https://github.com/Jaa-ack/FruitOPS](https://github.com/Jaa-ack/FruitOPS)

---

## 📋 資料庫遷移指南

### SQL 檔案說明

位於 `server/migrations/` 目錄：

1. **`schema.sql`** - 資料表結構定義
   - 8 個資料表（含 RFM 鎖定欄位）
   - 完整索引定義
   - 視圖定義
   - 詳細註解說明

2. **`seed_data.sql`** - 測試資料填充
   - 20 位客戶（含 3 位 VIP）
   - 14 筆訂單
   - 11 筆庫存記錄
   - 12 筆農務日誌

### 執行方式

#### 方法一：Supabase Dashboard（推薦）

1. 登入 **Supabase Dashboard**
2. 進入 **SQL Editor**
3. 複製貼上 `schema.sql` 的完整內容
4. 點擊 **RUN** 執行
5. 等待執行完成（應顯示 "Success"）
6. 再次複製貼上 `seed_data.sql` 的完整內容
7. 點擊 **RUN** 執行

#### 方法二：psql 命令列

```bash
# 連線到資料庫
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"

# 執行 SQL 檔案
\i server/migrations/schema.sql
\i server/migrations/seed_data.sql
```

#### 方法三：完整重建（開發環境）

```sql
-- 1. 先執行結構定義
\i server/migrations/schema.sql

-- 2. 再執行資料填充
\i server/migrations/seed_data.sql
```

### ⚠️ 重要注意事項

**資料清除警告：**
`schema.sql` 包含 `DROP TABLE` 指令，會**完全刪除現有資料**！

**生產環境請務必：**
1. 先備份現有資料
2. 或註解掉 DROP TABLE 指令
3. 改用 `ALTER TABLE` 方式增量更新

**開發環境使用：**
- ✅ 可以安全執行（重建整個資料庫）
- ✅ 適合初始化開發環境
- ✅ 適合重置測試資料

**生產環境使用：**
- ❌ **不要直接執行** `schema.sql`（會刪除資料）
- ✅ 僅在初次建立資料庫時使用
- ✅ 後續更新請使用增量遷移腳本

### 資料表結構概覽

```
product_grades        產品等級定義
storage_locations     儲存位置
plots                 地塊資訊
customers            客戶資料（含 RFM 欄位）
orders               訂單主表
order_items          訂單明細
inventory            庫存記錄
logs                 農務日誌

v_inventory_summary  庫存摘要視圖
```

### 驗證資料

執行後可用以下查詢驗證：

```sql
-- 檢查所有資料表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema='public' 
ORDER BY table_name;

-- 檢查資料筆數
SELECT 
  'customers' AS table_name, COUNT(*) AS count FROM customers UNION ALL
SELECT 'orders', COUNT(*) FROM orders UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory UNION ALL
SELECT 'logs', COUNT(*) FROM logs;

-- 檢查 VIP 客戶
SELECT name, segment, total_spent 
FROM customers 
WHERE total_spent >= 10000 
ORDER BY total_spent DESC;

-- 檢查庫存摘要
SELECT * FROM v_inventory_summary;
```

### RFM 分級鎖定功能

`customers` 表包含 RFM 鎖定欄位：

- `rfm_locked` (BOOLEAN): 是否鎖定 RFM 自動重算
- `rfm_locked_reason` (TEXT): 鎖定原因
- `rfm_locked_at` (TIMESTAMPTZ): 鎖定時間

**使用方式：**
1. 在 CRM 頁面選擇客戶
2. 點擊「編輯」
3. 勾選「鎖定 RFM 分級」
4. 輸入鎖定原因（例如：VIP 合約、手動調整）
5. 點擊「套用鎖定」

**效果：**
- 鎖定後的客戶不會受到「計算 RFM 分級」的影響
- 客戶詳情會顯示鎖定圖示
- 批次更新時會跳過已鎖定客戶並回傳統計

已建立索引提升查詢效能：
```sql
CREATE INDEX idx_customers_rfm_locked ON customers(rfm_locked) WHERE rfm_locked = TRUE;
```

---

## 🔧 系統架構

### 整體系統組成

```
┌─────────────────────────────────────────────────────────────┐
│                     FruitOPS 智能果園系統                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              前端 (React 19 + TypeScript)             │   │
│  │  ┌─────────────┬─────────────┬─────────────────────┐ │   │
│  │  │ Dashboard   │ Production  │ Inventory           │ │   │
│  │  │ (總覽/圖表) │ (地塊管理)  │ (多位置庫存)        │ │   │
│  │  └─────────────┴─────────────┴─────────────────────┘ │   │
│  │  ┌─────────────┬─────────────┬─────────────────────┐ │   │
│  │  │ Orders      │ CRM         │ Calendar            │ │   │
│  │  │ (訂單/揀貨) │ (客戶分級)  │ (季節行事曆)        │ │   │
│  │  └─────────────┴─────────────┴─────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  全局 Toast 通知系統 (實時反饋)                  │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓↑                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           後端 API (Express + Node.js)                │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ RESTful 端點                                     │ │   │
│  │  │ /api/products  /api/plots  /api/inventory      │ │   │
│  │  │ /api/orders    /api/customers /api/logs        │ │   │
│  │  │ /api/customers/segmentation (RFM 計算)         │ │   │
│  │  │ /api/ai-advice (Gemini AI 諮詢，超時 30 秒)    │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓↑                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         資料持久層 (Supabase PostgreSQL)             │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ Direct REST Client (避免 SDK 冷啟動)            │ │   │
│  │  │ 自動 camelCase ↔ snake_case 轉換               │ │   │
│  │  │ RFM 分級鎖定支援                                │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓↑                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              外部服務整合                             │   │
│  │  - Google Gemini AI (即時諮詢，超時 30 秒)          │   │
│  │  - Vercel Serverless Functions (生產部署)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 數據流向

```
使用者操作
    ↓
前端表單 (React)
    ↓
API 呼叫 (fetch)
    ↓
Express Router (超時保護：API 40s, AI 30s)
    ↓
業務邏輯層
    ├─→ Supabase Client (資料庫操作)
    └─→ Gemini AI (智能建議)
    ↓
回傳結果
    ↓
前端更新 UI + Toast 通知
```

### AI 助手工作流

```
用戶輸入問題
    ↓
前端收集上下文 (庫存、訂單、地塊等)
    ↓
呼叫 /api/ai-advice (超時 30 秒)
    ↓
組合系統提示詞 (system prompt) + 用戶問題
    ↓
Gemini API 生成回答
    ↓
解析 Markdown 格式回應
    ↓
顯示在 AI 顧問面板
    ↓
(Production 頁面) 儲存為 AIAdvice 日誌記錄
```

---

## 📖 常見問題與最佳實踐

### Q1: 為什麼要使用 Supabase 而非本地資料庫？
**A:** Supabase 提供：
- 自動擴展的 PostgreSQL 資料庫
- 內建 REST API（無需手寫 CRUD）
- 即時資料同步（未來可擴展）
- 免費層級足夠開發使用
- 生產級備份與安全性

### Q2: AI 功能是否必須？
**A:** 不是必須的。系統核心功能（庫存、訂單、CRM）不依賴 AI。
- 未設定 `GEMINI_API_KEY` 時，AI 顧問按鈕會隱藏
- 建議至少設定一個測試用 API Key 體驗智能建議功能

### Q3: 如何處理大量資料？
**A:** 系統設計考量：
- 前端分頁載入（避免一次載入所有訂單）
- 資料庫索引優化（RFM 查詢、庫存查詢）
- API 超時保護（40 秒限制）
- 建議定期歸檔舊訂單（>1年）

### Q4: RFM 分級多久執行一次？
**A:** 建議：
- **每週一次**：中小型果園（<100 位客戶）
- **每月一次**：大型果園（>100 位客戶）
- **手動觸發**：促銷活動前、年度回顧前

### Q5: 庫存時效如何計算？
**A:** 系統依據 `harvest_date` 自動計算：
```
agingDays = (今天 - harvest_date) / (24 * 60 * 60 * 1000)
```
- ⚠️ 請務必在入庫時填寫正確的 `harvest_date`
- 建議每日檢查「展示期」庫存（>14 天）

### Q6: 訂單狀態流轉規則？
**A:** 標準流程：
```
新訂單 → Pending (待確認)
       ↓
確認訂單 → Processing (處理中)
       ↓
揀貨完成 → Confirmed (已確認)
       ↓
出貨 → Shipped (已出貨)
       ↓
客戶收貨 → Completed (已完成)
```
- 只有 `Completed` 訂單計入銷售額
- `Cancelled` 訂單不影響庫存

### Q7: 如何備份資料？
**A:** Supabase 提供：
- 自動每日備份（保留 7 天）
- 手動匯出：Dashboard → Database → Backups
- SQL 匯出：`pg_dump` 指令

**建議：**
- 每月手動匯出一次完整備份
- 重要操作前（如大量刪除）先備份

### Q8: 超時設定為何這麼長？
**A:** 系統超時設定：
- **API 超時：40 秒**（應對複雜查詢、大量資料）
- **AI 超時：30 秒**（Gemini API 回應時間較長）

**為何需要：**
- RFM 計算需處理所有客戶訂單（可能數百筆）
- AI 生成詳細建議需要時間
- 避免因網路延遲導致請求失敗

**優化建議：**
- 定期清理過期資料
- 使用資料庫索引
- 分批處理大量操作

---

## 💡 最佳實踐建議

### 日常維護

**每日：**
- 檢查庫存時效（重點：展示期 >14 天）
- 處理新訂單（確認 → 揀貨 → 出貨）
- 記錄農務日誌（施肥、修剪、採收等）

**每週：**
- 執行 RFM 分級計算（建議週一）
- 查看地塊健康度評分
- 規劃下週生產與銷售計畫

**每月：**
- 月初：RFM 分級更新與客戶分析
- 月中：下月生產與銷售計畫
- 月底：本月數據分析與總結

### 資料維護

1. **訂單資料完整性：**
   - 確保填寫客戶名稱、通路、日期、金額
   - 訂單狀態及時更新（避免長期 Pending）
   - 已完成訂單不要輕易刪除（影響 RFM 計算）

2. **庫存入庫規範：**
   - **必填**：`harvest_date`（時效計算基礎）
   - **選填**：`origin_plot_id`（追溯來源地塊）
   - 建議：入庫時標註等級（A/B/C）

3. **農務日誌記錄：**
   - 詳細記錄作業類型、成本、備註
   - AI 建議會自動記錄為 `AIAdvice` 類型
   - 定期檢查日誌確保農務追蹤完整

4. **客戶資料維護：**
   - 確保聯絡電話正確（用於簡訊通知）
   - 偏好通路設定準確（影響推薦邏輯）
   - VIP 客戶可手動鎖定分級（避免誤降級）

### 善用 AI 輔助

**適合問 AI 的問題：**
- ✅ 「目前庫存中哪些品項需要優先促銷？」
- ✅ 「如何撰寫給 VIP 客戶的節日問候簡訊？」
- ✅ 「本月銷售趨勢分析與下月建議」
- ✅ 「地塊健康度低於 60 的處理建議」
- ✅ 「成本優化建議（施肥、噴藥、人力）」

**不適合問 AI 的問題：**
- ❌ 系統操作問題（請參考本文檔）
- ❌ 資料庫連線問題（請檢查環境變數）
- ❌ 需要即時數據的精確計算（系統已自動計算）

---

⭐ 如果這個專案對你有幫助，請給個 Star！

**需要協助？** 提交 [GitHub Issue](https://github.com/Jaa-ack/FruitOPS/issues)。
