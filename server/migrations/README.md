# FruitOPS 資料庫遷移指南

## 📁 檔案說明

### 最終版本（推薦使用）

1. **`schema.sql`** - 資料表結構定義
   - 建立所有資料表
   - 定義欄位、約束、外鍵
   - 建立索引提升效能
   - 建立視圖
   - 包含完整的註解說明

2. **`seed_data.sql`** - 測試資料填充
   - 產品等級定義（4 種產品）
   - 儲存位置（4 個）
   - 地塊資料（5 個）
   - 客戶資料（20 位）
   - 庫存記錄（11 筆）
   - 訂單與明細（14 筆訂單，含 3 位 VIP）
   - 農務日誌（12 筆）

### 舊版檔案（保留但不建議使用）

- `007_recreate_schema_and_seed_full.sql` - 舊版整合檔案
- `008_add_rfm_lock_fields.sql` - RFM 鎖定欄位（已整合進 schema.sql）

## 🚀 執行順序

### 方法一：完整重建（開發環境）

```sql
-- 1. 先執行結構定義
\i server/migrations/schema.sql

-- 2. 再執行資料填充
\i server/migrations/seed_data.sql
```

### 方法二：使用 Supabase Dashboard

1. 登入 **Supabase Dashboard**
2. 進入 **SQL Editor**
3. 複製貼上 `schema.sql` 的完整內容
4. 點擊 **RUN** 執行
5. 等待執行完成（應顯示 "Success"）
6. 再次複製貼上 `seed_data.sql` 的完整內容
7. 點擊 **RUN** 執行

### 方法三：使用 psql 命令列

```bash
# 連線到資料庫
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"

# 執行 SQL 檔案
\i /Users/jaaaaack/VSCode/FruitOPS/server/migrations/schema.sql
\i /Users/jaaaaack/VSCode/FruitOPS/server/migrations/seed_data.sql
```

## ⚠️ 重要注意事項

### 資料清除警告
`schema.sql` 包含 `DROP TABLE` 指令，會**完全刪除現有資料**！

```sql
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
-- ... 等
```

**生產環境請務必**：
1. 先備份現有資料
2. 或註解掉 DROP TABLE 指令
3. 改用 `ALTER TABLE` 方式增量更新

### 開發環境使用
- ✅ 可以安全執行（重建整個資料庫）
- ✅ 適合初始化開發環境
- ✅ 適合重置測試資料

### 生產環境使用
- ❌ **不要直接執行** `schema.sql`（會刪除資料）
- ✅ 僅在初次建立資料庫時使用
- ✅ 後續更新請使用增量遷移腳本

## 📊 資料表結構概覽

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

## 🔍 驗證資料

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

## 🆕 新功能：RFM 分級鎖定

`customers` 表包含 RFM 鎖定欄位：

- `rfm_locked` (BOOLEAN): 是否鎖定 RFM 自動重算
- `rfm_locked_reason` (TEXT): 鎖定原因
- `rfm_locked_at` (TIMESTAMPTZ): 鎖定時間

已建立索引提升查詢效能：
```sql
CREATE INDEX idx_customers_rfm_locked ON customers(rfm_locked) WHERE rfm_locked = TRUE;
```

## 📝 後續維護

建議後續的資料庫變更：
1. 建立新的遷移檔案（例如：`migration_YYYYMMDD_description.sql`）
2. 使用 `ALTER TABLE` 而非 `DROP TABLE`
3. 保持遷移檔案的可重複執行性（冪等性）
4. 記錄每次遷移的目的和影響範圍

## 🔗 相關文件

- API 文件：`README.md`
- 系統流程：`SYSTEM_WORKFLOW.md`
- 驗證報告：`VERIFICATION_REPORT.md`
