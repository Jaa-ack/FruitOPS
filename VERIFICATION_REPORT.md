# FruitOPS 功能更新驗證報告

## 📋 本次更新摘要

### 1. ⏱️ AI 超時時間延長
- **Server API 超時**：12s → 40s (`REQ_TIMEOUT_MS`)
- **AI 專用超時**：10s → 30s (`AI_TIMEOUT_MS`)
- **Client 呼叫超時**：12s → 35s (`services/api.ts`)
- **文件更新**：`.env`, `SYSTEM_WORKFLOW.md`, `README.md`

### 2. 🔒 RFM 分級鎖定機制
- **資料庫欄位**（需執行 `migrations/008_add_rfm_lock_fields.sql`）：
  - `rfm_locked`: BOOLEAN NOT NULL DEFAULT FALSE
  - `rfm_locked_reason`: TEXT（鎖定原因記錄）
  - `rfm_locked_at`: TIMESTAMPTZ（鎖定時間戳）
- **後端 API**：
  - `PUT /api/customers/:id/segmentation-lock`：設定/取消鎖定
  - `POST /api/customers/segmentation/apply`：批次更新時跳過鎖定客戶，回傳 `{ updated, skippedLocked }` 統計
- **前端 UI**（`components/CRM.tsx`）：
  - 客戶詳情顯示鎖定指示器（Lock 圖示）
  - 編輯面板新增鎖定選項：checkbox + 原因輸入框 + 套用按鈕
  - Toast 通知鎖定/解鎖狀態

### 3. 📦 庫存資訊優化
- **移除顯示**：批次編號（batchId）、包裝規格（packageSpec）
- **新增顯示**：地塊名稱（originPlotName），由 `plots` 表查詢對應
- **通路推薦卡片**（`components/Inventory.tsx`）：
  - 點擊「生鮮期/保鮮期」洞察卡片 → 彈出符合該通路的客戶清單
  - 客戶清單可直接連結到 CRM 頁面（`#/crm?customer=名稱`）
- **簡化指標**：僅顯示「生鮮期（≤7天）」與「保鮮期（8-14天）」，移除「展示期」與「平均庫存」

## ✅ 程式碼驗證結果

### 編譯測試
```bash
npm run build
# ✓ 2334 modules transformed
# ✓ built in 1.89s
# 無 TypeScript 錯誤
```

### 關鍵程式碼確認
- ✅ `server/index.js`: REQ_TIMEOUT_MS=40000, AI_TIMEOUT_MS=30000
- ✅ `server/supabase-direct.js`:
  - `updateCustomerLock()` 函數已實作
  - `updateCustomerSegments()` 檢查 `rfm_locked` 欄位
  - `getInventoryV2()` 查詢 plots 表並映射 `originPlotName`
- ✅ `components/CRM.tsx`: lockForm 狀態、UI toggle、API 呼叫
- ✅ `components/Inventory.tsx`: recommendModal 狀態、insights 卡片點擊、客戶篩選
- ✅ `types.ts`: Customer 介面包含 `rfmLocked?`, `rfmLockedReason?`, `rfmLockedAt?`
- ✅ `services/api.ts`: callAI timeout=35000

## 🔧 資料庫遷移

### 必須手動執行
由於本地未配置 Supabase 連線資訊，請在 **Supabase Dashboard > SQL Editor** 執行以下檔案：

**檔案**：`server/migrations/008_add_rfm_lock_fields.sql`

**內容摘要**：
```sql
-- 1. 新增欄位（冪等性設計）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rfm_locked BOOLEAN;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rfm_locked_reason TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rfm_locked_at TIMESTAMPTZ;

-- 2. 回填既有列預設值
UPDATE customers
SET
  rfm_locked = COALESCE(rfm_locked, FALSE),
  rfm_locked_reason = COALESCE(rfm_locked_reason, NULL),
  rfm_locked_at = COALESCE(rfm_locked_at, NULL)
WHERE rfm_locked IS NULL;

-- 3. 設定約束
ALTER TABLE customers ALTER COLUMN rfm_locked SET DEFAULT FALSE;
ALTER TABLE customers ALTER COLUMN rfm_locked SET NOT NULL;

-- 4. 建立索引（加速查詢）
CREATE INDEX IF NOT EXISTS idx_customers_rfm_locked ON customers(rfm_locked) WHERE rfm_locked = TRUE;

-- 5. 欄位註解
COMMENT ON COLUMN customers.rfm_locked IS 'RFM 分級鎖定：TRUE 表示此客戶不受自動 RFM 重算影響';
...
```

**驗證查詢**（執行後檢查）：
```sql
-- 檢查欄位類型
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='customers'
  AND column_name IN ('rfm_locked','rfm_locked_reason','rfm_locked_at')
ORDER BY column_name;

-- 統計鎖定數量
SELECT
  COUNT(*) AS total_customers,
  SUM(CASE WHEN rfm_locked THEN 1 ELSE 0 END) AS locked_count
FROM customers;
```

## 📝 測試建議

### 1. 資料庫測試
- [ ] 執行 `008_add_rfm_lock_fields.sql`
- [ ] 驗證欄位存在且有正確預設值
- [ ] 確認所有既有客戶的 `rfm_locked` 為 `FALSE`

### 2. API 測試
```bash
# 啟動伺服器（需先配置 Supabase 環境變數）
cd server && npm start

# 測試鎖定 API
curl -X PUT http://localhost:4000/api/customers/1/segmentation-lock \
  -H "Content-Type: application/json" \
  -d '{"locked":true,"reason":"VIP 合約價固定"}'

# 測試庫存 API（檢查 originPlotName）
curl http://localhost:4000/api/inventory-detail
```

### 3. 前端測試
- [ ] 開啟 CRM 頁面，選擇一位客戶
- [ ] 點擊「編輯」，勾選「鎖定 RFM 分級」，輸入原因，點擊「套用鎖定」
- [ ] 確認客戶詳情顯示鎖定圖示
- [ ] 開啟庫存頁面，確認：
  - [ ] 不顯示批次編號與包裝規格
  - [ ] 顯示地塊名稱（若有 origin_plot_id）
  - [ ] 點擊「生鮮期」或「保鮮期」卡片
  - [ ] 彈出視窗顯示符合通路的客戶
  - [ ] 點擊客戶名稱能跳轉到 CRM

### 4. AI 超時測試
- [ ] 開啟 Gemini Advisor 或任一使用 AI 的功能
- [ ] 觀察是否能容忍較長回應時間（不會提早超時）

## 🚀 下一步

1. **執行資料庫遷移**（請使用 Supabase Dashboard）
2. **本地測試**（若需要，可配置 `.env.local` 後測試）
3. **提交到 GitHub**：
   ```bash
   git add .
   git commit -m "feat: extend AI timeout, add RFM lock, optimize inventory UI

   - Extend timeout: API 40s, AI 30s, client 35s
   - Add RFM segmentation lock: DB schema, API, UI toggle
   - Optimize inventory: hide batch info, show plot name, add channel recommendations"
   git push origin main
   ```

## 📊 檔案變更清單

### 新增檔案
- `server/migrations/008_add_rfm_lock_fields.sql`：RFM 鎖定欄位遷移
- `server/run_migration_008.js`：自動執行遷移（需配置 Supabase）
- `server/check_env.js`：環境檢查工具
- `VERIFICATION_REPORT.md`：本驗證報告

### 修改檔案
- `server/index.js`：超時設定、新增 segmentation-lock endpoint
- `server/supabase-direct.js`：lock 函數、鎖定過濾、plot name 映射
- `components/CRM.tsx`：鎖定 UI toggle
- `components/Inventory.tsx`：簡化顯示、通路推薦
- `services/api.ts`：client 超時
- `types.ts`：Customer 介面擴充
- `.env`：超時預設值
- `README.md`：文件更新
- `SYSTEM_WORKFLOW.md`：超時說明更新

---

**驗證狀態**：✅ 程式碼完成並編譯通過  
**待處理**：資料庫遷移（需手動執行 SQL）、本地功能測試（選填）  
**可推送**：是（建議先執行 SQL 遷移後再測試，或直接推送由部署環境驗證）
