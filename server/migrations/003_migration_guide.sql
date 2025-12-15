-- ============================================================================
-- FruitOPS 資料庫遷移執行指南
-- ============================================================================
-- 
-- 此文件包含分步執行的 SQL 遷移指令
-- 請按順序在 Supabase SQL 編輯器中逐步執行
--
-- ============================================================================

-- ============================================================================
-- 步驟 1: 確認現有表結構
-- ============================================================================

-- 查看現有 orders 表結構
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 查看現有 inventory 表結構（如果存在）
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'inventory' 
ORDER BY ordinal_position;

-- ============================================================================
-- 步驟 2: 建立新表 - product_grades（作物品級配置）
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL UNIQUE,
  grades TEXT[] NOT NULL DEFAULT ARRAY['A', 'B', 'C'],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入作物品級配置
INSERT INTO public.product_grades (product_name, grades) VALUES
('桃子', ARRAY['A', 'B', 'C']),
('柿子', ARRAY['A', 'B']),
('水梨', ARRAY['A', 'B', 'C']),
('蜜蘋果', ARRAY['A', 'B', 'C'])
ON CONFLICT (product_name) DO UPDATE SET 
  grades = EXCLUDED.grades,
  updated_at = CURRENT_TIMESTAMP;

-- 驗證
SELECT * FROM public.product_grades ORDER BY product_name;

-- ============================================================================
-- 步驟 3: 建立新表 - inventory_v2（多位置庫存）
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  harvest_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_name, grade, location_id)
);

-- 建立索引
CREATE INDEX idx_inventory_v2_product_grade ON public.inventory_v2(product_name, grade);
CREATE INDEX idx_inventory_v2_location ON public.inventory_v2(location_id);
CREATE INDEX idx_inventory_v2_product ON public.inventory_v2(product_name);

-- ============================================================================
-- 步驟 4: 建立新表 - order_items（訂單詳細項目）
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * price) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_name, grade);

-- ============================================================================
-- 步驟 5: 修改 orders 表（如需要）
-- ============================================================================

-- 如果 orders 表有 items 欄位，先備份數據
CREATE TABLE IF NOT EXISTS orders_backup AS
SELECT * FROM public.orders;

-- 移除 items 欄位（如果存在）
ALTER TABLE public.orders DROP COLUMN IF EXISTS items;

-- 添加 order_code 欄位（可選）
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_code TEXT UNIQUE;

-- ============================================================================
-- 步驟 6: 建立視圖 - v_inventory_summary（庫存摘要）
-- ============================================================================

CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT 
  product_name,
  SUM(quantity)::INTEGER as total_quantity,
  COUNT(DISTINCT grade)::INTEGER as grade_count,
  COUNT(DISTINCT location_id)::INTEGER as location_count
FROM public.inventory_v2
WHERE quantity > 0
GROUP BY product_name
ORDER BY product_name;

-- 驗證
SELECT * FROM v_inventory_summary;

-- ============================================================================
-- 步驟 7: 建立視圖 - v_inventory_detail（庫存詳細）
-- ============================================================================

CREATE OR REPLACE VIEW v_inventory_detail AS
SELECT 
  i.id,
  i.product_name,
  i.grade,
  i.quantity,
  COALESCE(l.name, '未指定') as location_name,
  l.id as location_id,
  i.harvest_date,
  i.created_at,
  i.updated_at
FROM public.inventory_v2 i
LEFT JOIN public.storage_locations l ON i.location_id = l.id
WHERE i.quantity > 0
ORDER BY i.product_name, i.grade, l.name;

-- 驗證
SELECT * FROM v_inventory_detail;

-- ============================================================================
-- 步驟 8: 建立視圖 - v_orders_with_details（訂單詳細）
-- ============================================================================

CREATE OR REPLACE VIEW v_orders_with_details AS
SELECT 
  o.id,
  o.customer_name,
  o.channel,
  o.total,
  o.status,
  o.created_at,
  COUNT(oi.id)::INTEGER as item_count,
  SUM(oi.quantity)::INTEGER as total_quantity
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.customer_name, o.channel, o.total, o.status, o.created_at;

-- 驗證
SELECT * FROM v_orders_with_details ORDER BY created_at DESC;

-- ============================================================================
-- 步驟 9: 遷移現有庫存數據（可選 - 根據實際情況執行）
-- ============================================================================

-- 如果舊 inventory 表存在且有數據，備份舊表
CREATE TABLE IF NOT EXISTS inventory_backup AS
SELECT * FROM public.inventory;

-- 遷移數據到 inventory_v2
-- INSERT INTO public.inventory_v2 (product_name, grade, quantity, location_id, harvest_date)
-- SELECT 
--   COALESCE(product_name, '未知'),
--   COALESCE(grade, 'A'),
--   COALESCE(quantity, 0),
--   location_id,
--   harvest_date
-- FROM public.inventory
-- WHERE product_name IS NOT NULL 
--   AND grade IS NOT NULL
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- 步驟 10: 遷移現有訂單數據（可選 - 根據實際情況執行）
-- ============================================================================

-- 如果舊 orders 表有 items 列（JSON 格式），遷移訂單項目
-- INSERT INTO public.order_items (order_id, product_name, grade, quantity, price)
-- SELECT 
--   o.id,
--   (item->>'productName')::TEXT as product_name,
--   COALESCE((item->>'grade')::TEXT, 'A') as grade,
--   (item->>'qty')::INTEGER as quantity,
--   (item->>'price')::DECIMAL as price
-- FROM public.orders o,
--      jsonb_array_elements(CAST(o.items AS jsonb)) as item
-- WHERE o.items IS NOT NULL
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- 步驟 11: 驗證遷移完整性
-- ============================================================================

-- 檢查作物品級配置
SELECT 'product_grades' as table_name, COUNT(*) as row_count FROM public.product_grades;

-- 檢查庫存
SELECT 'inventory_v2' as table_name, COUNT(*) as row_count FROM public.inventory_v2;

-- 檢查訂單項目
SELECT 'order_items' as table_name, COUNT(*) as row_count FROM public.order_items;

-- 檢查視圖
SELECT 'v_inventory_summary' as view_name, COUNT(*) as row_count FROM v_inventory_summary;
SELECT 'v_inventory_detail' as view_name, COUNT(*) as row_count FROM v_inventory_detail;

-- ============================================================================
-- 步驟 12: 測試數據（可選 - 用於測試新系統）
-- ============================================================================

-- 插入測試庫存數據
-- 首先獲取 storage_locations 的 ID
-- SELECT id, name FROM public.storage_locations LIMIT 5;

-- 然後插入測試數據
-- INSERT INTO public.inventory_v2 (product_name, grade, quantity, location_id, harvest_date)
-- VALUES 
--   ('桃子', 'A', 150, (SELECT id FROM public.storage_locations WHERE name = '冷藏庫 1' LIMIT 1), '2025-12-01'),
--   ('桃子', 'B', 200, (SELECT id FROM public.storage_locations WHERE name = '冷藏庫 1' LIMIT 1), '2025-12-01'),
--   ('桃子', 'C', 100, (SELECT id FROM public.storage_locations WHERE name = '倉庫 A' LIMIT 1), '2025-12-01'),
--   ('水梨', 'A', 250, (SELECT id FROM public.storage_locations WHERE name = '倉庫 A' LIMIT 1), '2025-12-05'),
--   ('水梨', 'B', 180, (SELECT id FROM public.storage_locations WHERE name = '倉庫 B' LIMIT 1), '2025-12-05');

-- ============================================================================
-- 完成！
-- ============================================================================
-- 遷移完成後，請測試所有 API 端點：
-- - GET /api/inventory-summary
-- - GET /api/inventory-detail
-- - POST /api/inventory-v2
-- - GET /api/product-grades
-- - POST /api/orders
-- - GET /api/orders
