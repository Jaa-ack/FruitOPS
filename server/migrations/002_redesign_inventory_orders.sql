-- ============================================================================
-- FruitOPS 庫存與訂單系統重構
-- 支持多位置庫存、多級別管理、詳細訂單項目
-- ============================================================================

-- 步驟 1: 建立作物品級配置表 (product_grades)
-- 定義每個作物支持的級別（桃子/水梨/蜜蘋果: A/B/C, 柿子: A/B）
CREATE TABLE IF NOT EXISTS public.product_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL UNIQUE,
  grades TEXT[] NOT NULL DEFAULT ARRAY['A', 'B', 'C'],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 步驟 2: 建立新庫存表 (inventory_v2)
-- 支持多位置、多級別的庫存管理
-- 允許同一產品同一級別在多個不同位置
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

-- 步驟 3: 建立訂單詳細項目表 (order_items)
-- 記錄每筆訂單的多個商品項目，支持複雜訂單
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

-- 步驟 4: 修改訂單表 (orders)
-- 移除 items 欄位，改用 order_items 表存儲詳細項目
-- 注意：如果舊表中有 items 欄位，先執行以下命令
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS items;
-- 如果舊表沒有 order_code, 可執行：
-- ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_code TEXT UNIQUE;

-- 步驟 5: 建立索引以優化查詢性能
CREATE INDEX IF NOT EXISTS idx_inventory_v2_product_grade 
  ON public.inventory_v2(product_name, grade);
CREATE INDEX IF NOT EXISTS idx_inventory_v2_location 
  ON public.inventory_v2(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_v2_product 
  ON public.inventory_v2(product_name);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
  ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product 
  ON public.order_items(product_name, grade);
CREATE INDEX IF NOT EXISTS idx_product_grades_product 
  ON public.product_grades(product_name);

-- 步驟 6: 建立視圖 - 庫存摘要（按產品統計）
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

-- 步驟 7: 建立視圖 - 庫存詳細（產品-級別-位置）
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

-- 步驟 8: 建立視圖 - 訂單詳細（附帶客戶信息）
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

-- 步驟 9: 插入預定義的作物品級配置
-- 桃子、水梨、蜜蘋果: A/B/C 三級
-- 柿子: A/B 兩級
INSERT INTO public.product_grades (product_name, grades) VALUES
('桃子', ARRAY['A', 'B', 'C']),
('柿子', ARRAY['A', 'B']),
('水梨', ARRAY['A', 'B', 'C']),
('蜜蘋果', ARRAY['A', 'B', 'C'])
ON CONFLICT (product_name) DO UPDATE SET 
  grades = EXCLUDED.grades,
  updated_at = CURRENT_TIMESTAMP;

-- 步驟 10: 遷移現有庫存數據（如果有）
-- 如果舊 inventory 表存在且有數據，執行以下（根據實際結構調整）
-- INSERT INTO public.inventory_v2 (product_name, grade, quantity, location_id, harvest_date)
-- SELECT 
--   product_name, 
--   grade, 
--   quantity, 
--   location_id, 
--   harvest_date
-- FROM public.inventory
-- WHERE product_name IS NOT NULL 
--   AND grade IS NOT NULL
-- ON CONFLICT DO NOTHING;

-- 步驟 11: 遷移現有訂單數據（如果有）
-- 如果舊 orders 表有 items 列且是 JSON 格式，執行以下
-- INSERT INTO public.order_items (order_id, product_name, grade, quantity, price)
-- SELECT 
--   o.id,
--   (item->>'productName')::TEXT as product_name,
--   (item->>'grade')::TEXT as grade,
--   (item->>'qty')::INTEGER as quantity,
--   (item->>'price')::DECIMAL as price
-- FROM public.orders o,
--      jsonb_array_elements(CAST(o.items AS jsonb)) as item
-- WHERE o.items IS NOT NULL;

-- 步驟 12: 啟用 RLS（如需要）
-- ALTER TABLE public.inventory_v2 ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 驗證腳本（遷移完成後執行）
-- ============================================================================

-- 檢查作物品級配置
-- SELECT * FROM public.product_grades ORDER BY product_name;

-- 檢查庫存摘要視圖
-- SELECT * FROM v_inventory_summary;

-- 檢查庫存詳細視圖
-- SELECT * FROM v_inventory_detail ORDER BY product_name, grade, location_name;

-- 檢查訂單詳細視圖
-- SELECT * FROM v_orders_with_details ORDER BY created_at DESC;

-- 檢查訂單項目
-- SELECT * FROM public.order_items ORDER BY created_at DESC LIMIT 10;

COMMIT;

