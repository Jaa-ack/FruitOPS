-- 008_add_rfm_lock_fields.sql
-- 新增 RFM 分級鎖定相關欄位到 customers 表
-- 此遷移為冪等性（可安全重複執行）

BEGIN;

-- 1) 新增欄位（若不存在）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rfm_locked BOOLEAN;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rfm_locked_reason TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rfm_locked_at TIMESTAMPTZ;

-- 2) 回填所有既有列的欄位值（設定預設值）
UPDATE customers
SET
  rfm_locked = COALESCE(rfm_locked, FALSE),
  rfm_locked_reason = COALESCE(rfm_locked_reason, NULL),
  rfm_locked_at = COALESCE(rfm_locked_at, NULL)
WHERE rfm_locked IS NULL;

-- 3) 設定欄位約束與預設值（確保未來插入也有預設值）
ALTER TABLE customers ALTER COLUMN rfm_locked SET DEFAULT FALSE;
ALTER TABLE customers ALTER COLUMN rfm_locked SET NOT NULL;

-- 4) 建立索引以加速鎖定狀態查詢
CREATE INDEX IF NOT EXISTS idx_customers_rfm_locked ON customers(rfm_locked) WHERE rfm_locked = TRUE;

-- 5) 註解說明
COMMENT ON COLUMN customers.rfm_locked IS 'RFM 分級鎖定：TRUE 表示此客戶不受自動 RFM 重算影響';
COMMENT ON COLUMN customers.rfm_locked_reason IS '鎖定原因：記錄為何鎖定此客戶（例如：VIP 合約、手動調整）';
COMMENT ON COLUMN customers.rfm_locked_at IS '鎖定時間：記錄何時鎖定';

COMMIT;

-- =====================================================================
-- 驗證查詢（執行後可用以下查詢檢查）
-- =====================================================================

-- 檢查欄位是否存在且有正確的類型
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='customers'
--   AND column_name IN ('rfm_locked','rfm_locked_reason','rfm_locked_at')
-- ORDER BY column_name;

-- 統計鎖定客戶數量
-- SELECT
--   COUNT(*) AS total_customers,
--   SUM(CASE WHEN rfm_locked THEN 1 ELSE 0 END) AS locked_count,
--   SUM(CASE WHEN NOT rfm_locked THEN 1 ELSE 0 END) AS unlocked_count
-- FROM customers;

-- 查看所有鎖定客戶的詳細資訊
-- SELECT id, name, segment, rfm_locked, rfm_locked_reason, rfm_locked_at, created_at
-- FROM customers
-- WHERE rfm_locked = TRUE
-- ORDER BY rfm_locked_at DESC NULLS LAST, name;
