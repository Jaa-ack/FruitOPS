-- =====================================================================
-- FruitOPS 資料庫結構定義
-- 建立所有資料表、索引、視圖和約束
-- =====================================================================

BEGIN;

-- 確保 UUID 生成功能可用
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 清理現有資料庫物件（開發用，生產環境請謹慎使用）
-- 注意：這將刪除所有資料！
DROP VIEW IF EXISTS v_inventory_summary CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS storage_locations CASCADE;
DROP TABLE IF EXISTS plots CASCADE;
DROP TABLE IF EXISTS product_grades CASCADE;

-- =====================================================================
-- 資料表定義
-- =====================================================================

-- 產品等級定義表
CREATE TABLE product_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL UNIQUE,
  grades TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE product_grades IS '產品等級定義：儲存每種產品的可用等級（如 A、B、C 級）';
COMMENT ON COLUMN product_grades.product_name IS '產品名稱（唯一）';
COMMENT ON COLUMN product_grades.grades IS '等級陣列（例如：{A,B,C}）';

-- 儲存位置表
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE storage_locations IS '儲存位置：冷藏、常溫、門市等倉儲地點';
COMMENT ON COLUMN storage_locations.name IS '位置名稱（唯一）';
COMMENT ON COLUMN storage_locations.type IS '位置類型：Cold(冷藏)、Ambient(常溫)、Retail(門市)、Transit(運輸)';

-- 地塊表
CREATE TABLE plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  crop TEXT NOT NULL,
  area NUMERIC,
  status TEXT NOT NULL,
  health INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plots IS '農地地塊：記錄各個果園地塊的資訊';
COMMENT ON COLUMN plots.name IS '地塊名稱（唯一）';
COMMENT ON COLUMN plots.crop IS '種植作物';
COMMENT ON COLUMN plots.area IS '地塊面積（公頃）';
COMMENT ON COLUMN plots.status IS '狀態：Active(活躍)、Maintenance(維護)';
COMMENT ON COLUMN plots.health IS '健康度（0-100）';

-- 客戶表
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  phone TEXT,
  region TEXT,
  preferred_channel TEXT,
  segment TEXT,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  rfm_locked BOOLEAN NOT NULL DEFAULT FALSE,
  rfm_locked_reason TEXT,
  rfm_locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE customers IS '客戶資料：包含聯絡資訊、消費記錄和 RFM 分級';
COMMENT ON COLUMN customers.name IS '客戶姓名（唯一）';
COMMENT ON COLUMN customers.phone IS '聯絡電話';
COMMENT ON COLUMN customers.region IS '所屬區域';
COMMENT ON COLUMN customers.preferred_channel IS '偏好通路：Direct(直銷)、Line、Phone、Wholesale(批發)';
COMMENT ON COLUMN customers.segment IS 'RFM 分級：VIP、Stable(穩定)、Regular(一般)、At Risk(流失風險)、New(新客戶)';
COMMENT ON COLUMN customers.total_spent IS '累計消費金額';
COMMENT ON COLUMN customers.last_order_date IS '最後訂單日期';
COMMENT ON COLUMN customers.rfm_locked IS 'RFM 分級鎖定：TRUE 表示此客戶不受自動 RFM 重算影響';
COMMENT ON COLUMN customers.rfm_locked_reason IS '鎖定原因：記錄為何鎖定此客戶（例如：VIP 合約、手動調整）';
COMMENT ON COLUMN customers.rfm_locked_at IS '鎖定時間：記錄何時鎖定';

-- 訂單表
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  channel TEXT,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orders IS '訂單主表：記錄客戶訂單的基本資訊';
COMMENT ON COLUMN orders.customer_name IS '客戶姓名';
COMMENT ON COLUMN orders.channel IS '訂單通路';
COMMENT ON COLUMN orders.total IS '訂單總金額';
COMMENT ON COLUMN orders.status IS '訂單狀態：Pending(待處理)、Processing(處理中)、Completed(已完成)、Cancelled(已取消)';

-- 訂單明細表
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  origin_plot_id UUID NULL REFERENCES plots(id)
);

COMMENT ON TABLE order_items IS '訂單明細：訂單中的每個產品項目';
COMMENT ON COLUMN order_items.order_id IS '所屬訂單 ID（外鍵）';
COMMENT ON COLUMN order_items.product_name IS '產品名稱';
COMMENT ON COLUMN order_items.grade IS '產品等級';
COMMENT ON COLUMN order_items.quantity IS '訂購數量';
COMMENT ON COLUMN order_items.price IS '單價';
COMMENT ON COLUMN order_items.origin_plot_id IS '來源地塊 ID（選填）';

-- 庫存表
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE RESTRICT,
  harvest_date DATE,
  origin_plot_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE inventory IS '庫存記錄：追蹤各儲存位置的產品庫存';
COMMENT ON COLUMN inventory.product_name IS '產品名稱';
COMMENT ON COLUMN inventory.grade IS '產品等級';
COMMENT ON COLUMN inventory.quantity IS '庫存數量';
COMMENT ON COLUMN inventory.location_id IS '儲存位置 ID（外鍵）';
COMMENT ON COLUMN inventory.harvest_date IS '採收日期';
COMMENT ON COLUMN inventory.origin_plot_id IS '來源地塊 ID（選填）';

-- 作業日誌表
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE RESTRICT,
  activity TEXT NOT NULL,
  crop_type TEXT,
  notes TEXT,
  cost NUMERIC NOT NULL DEFAULT 0,
  worker TEXT NOT NULL
);

COMMENT ON TABLE logs IS '農務日誌：記錄各地塊的農事活動';
COMMENT ON COLUMN logs.date IS '作業日期';
COMMENT ON COLUMN logs.plot_id IS '地塊 ID（外鍵）';
COMMENT ON COLUMN logs.activity IS '活動類型：Fertilize(施肥)、Pesticide(施藥)、Pruning(修剪)、Weeding(除草)、Bagging(套袋)、Harvest(採收)、AIAdvice(AI建議)';
COMMENT ON COLUMN logs.crop_type IS '作物類型';
COMMENT ON COLUMN logs.notes IS '作業備註';
COMMENT ON COLUMN logs.cost IS '作業成本';
COMMENT ON COLUMN logs.worker IS '作業人員';

-- =====================================================================
-- 索引定義
-- =====================================================================

-- 客戶 RFM 鎖定查詢索引（部分索引，僅索引已鎖定的記錄）
CREATE INDEX idx_customers_rfm_locked ON customers(rfm_locked) WHERE rfm_locked = TRUE;

-- 訂單相關索引
CREATE INDEX idx_orders_customer_name ON orders(customer_name);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 庫存相關索引
CREATE INDEX idx_inventory_product_grade ON inventory(product_name, grade);
CREATE INDEX idx_inventory_location_id ON inventory(location_id);
CREATE INDEX idx_inventory_harvest_date ON inventory(harvest_date);

-- 日誌相關索引
CREATE INDEX idx_logs_plot_id ON logs(plot_id);
CREATE INDEX idx_logs_date ON logs(date DESC);
CREATE INDEX idx_logs_activity ON logs(activity);

-- =====================================================================
-- 視圖定義
-- =====================================================================

-- 庫存摘要視圖
CREATE VIEW v_inventory_summary AS
SELECT
  product_name,
  SUM(quantity) AS total_quantity,
  COUNT(DISTINCT grade) AS grade_count,
  COUNT(DISTINCT location_id) AS location_count
FROM inventory
GROUP BY product_name;

COMMENT ON VIEW v_inventory_summary IS '庫存摘要：依產品彙總數量、等級數、位置數';

COMMIT;

-- =====================================================================
-- 驗證查詢（可選）
-- =====================================================================

-- 檢查所有資料表是否建立成功
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema='public' 
-- ORDER BY table_name;

-- 檢查客戶表結構
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='customers'
-- ORDER BY ordinal_position;
