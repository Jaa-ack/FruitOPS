-- =====================================================================
-- FruitOPS 資料填充
-- 填充測試/開發用的初始資料
-- 執行前請先執行 schema.sql 建立資料表結構
-- =====================================================================

BEGIN;

-- =====================================================================
-- 產品等級定義
-- =====================================================================

INSERT INTO product_grades (product_name, grades) VALUES
  ('水蜜桃', ARRAY['A','B','C']),
  ('蜜蘋果', ARRAY['A','B','C']),
  ('柿子',   ARRAY['A','B']),
  ('梨子',   ARRAY['A','B','C'])
ON CONFLICT (product_name) DO UPDATE SET grades = EXCLUDED.grades;

-- =====================================================================
-- 儲存位置
-- =====================================================================

INSERT INTO storage_locations (name, type) VALUES
  ('冷藏一號', 'Cold'),
  ('常溫倉', 'Ambient'),
  ('門市展示', 'Retail'),
  ('批發運輸', 'Transit')
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- 地塊資料
-- =====================================================================

INSERT INTO plots (name, crop, area, status, health) VALUES
  ('北坡一號', '水蜜桃', 0.8, 'Active', 88),
  ('南坡二號', '柿子',   0.6, 'Maintenance', 72),
  ('河畔區',   '梨子',   1.2, 'Active', 90),
  ('東側試驗田', '蜜蘋果', 0.4, 'Active', 75),
  ('西側老園',   '柿子',   1.0, 'Maintenance', 65)
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- 客戶資料（20 位客戶）
-- =====================================================================

INSERT INTO customers (name, phone, region, preferred_channel, segment) VALUES
  ('陳大同','0912-111-222','北區','Direct','Regular'),
  ('林小美','0922-333-444','中區','Line','Stable'),
  ('王阿強','0933-555-666','南區','Phone','VIP'),
  ('張三','0955-777-888','北區','Wholesale','Regular'),
  ('李四','0966-999-000','中區','Direct','At Risk'),
  ('吳五','0977-000-111','南區','Line','Regular'),
  ('周六','0988-222-333','北區','Phone','Stable'),
  ('許七','0999-444-555','中區','Line','Regular'),
  ('黃八','0910-666-777','南區','Wholesale','Regular'),
  ('何九','0921-888-999','北區','Direct','New'),
  ('羅十','0932-111-333','中區','Phone','Stable'),
  ('鄭十一','0943-222-444','南區','Line','VIP'),
  ('方十二','0911-222-333','北區','Direct','Regular'),
  ('高十三','0922-444-555','中區','Line','Regular'),
  ('尤十四','0933-666-777','南區','Phone','At Risk'),
  ('錢十五','0944-888-000','北區','Wholesale','Regular'),
  ('吳十六','0955-111-222','中區','Direct','Stable'),
  ('孫十七','0966-333-444','南區','Line','Regular'),
  ('周十八','0977-555-666','北區','Phone','New'),
  ('吳十九','0988-777-888','中區','Direct','Regular')
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- 庫存資料（11 筆跨越多個產品、等級和位置）
-- =====================================================================

-- 使用 CTE 獲取儲存位置 ID
WITH loc AS (
  SELECT name, id FROM storage_locations
)
INSERT INTO inventory (product_name, grade, quantity, location_id, harvest_date, origin_plot_id)
SELECT '水蜜桃','A',120,(SELECT id FROM loc WHERE name='冷藏一號'), CURRENT_DATE - INTERVAL '5 days',(SELECT id FROM plots WHERE name='北坡一號') UNION ALL
SELECT '水蜜桃','B',200,(SELECT id FROM loc WHERE name='常溫倉'), CURRENT_DATE - INTERVAL '8 days',(SELECT id FROM plots WHERE name='北坡一號') UNION ALL
SELECT '水蜜桃','C',150,(SELECT id FROM loc WHERE name='門市展示'), CURRENT_DATE - INTERVAL '2 days',(SELECT id FROM plots WHERE name='北坡一號') UNION ALL
SELECT '蜜蘋果','A',80,(SELECT id FROM loc WHERE name='冷藏一號'), CURRENT_DATE - INTERVAL '4 days',(SELECT id FROM plots WHERE name='東側試驗田') UNION ALL
SELECT '蜜蘋果','B',140,(SELECT id FROM loc WHERE name='門市展示'), CURRENT_DATE - INTERVAL '3 days',(SELECT id FROM plots WHERE name='東側試驗田') UNION ALL
SELECT '蜜蘋果','C',220,(SELECT id FROM loc WHERE name='常溫倉'), CURRENT_DATE - INTERVAL '10 days',(SELECT id FROM plots WHERE name='東側試驗田') UNION ALL
SELECT '柿子','A',90,(SELECT id FROM loc WHERE name='冷藏一號'), CURRENT_DATE - INTERVAL '6 days',(SELECT id FROM plots WHERE name='南坡二號') UNION ALL
SELECT '柿子','B',160,(SELECT id FROM loc WHERE name='常溫倉'), CURRENT_DATE - INTERVAL '9 days',(SELECT id FROM plots WHERE name='南坡二號') UNION ALL
SELECT '梨子','A',110,(SELECT id FROM loc WHERE name='冷藏一號'), CURRENT_DATE - INTERVAL '7 days',(SELECT id FROM plots WHERE name='河畔區') UNION ALL
SELECT '梨子','B',180,(SELECT id FROM loc WHERE name='常溫倉'), CURRENT_DATE - INTERVAL '5 days',(SELECT id FROM plots WHERE name='河畔區') UNION ALL
SELECT '梨子','C',200,(SELECT id FROM loc WHERE name='批發運輸'), CURRENT_DATE - INTERVAL '1 day',(SELECT id FROM plots WHERE name='河畔區');

-- =====================================================================
-- 訂單與訂單明細（15 筆訂單，包含 3 位 VIP 客戶的多筆訂單）
-- =====================================================================

-- 訂單 1: 陳大同
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'陳大同','Direct',2350,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','A',3,350 FROM o UNION ALL SELECT id,'梨子','B',5,220 FROM o;
UPDATE customers SET total_spent = total_spent + 2350, last_order_date = NOW() WHERE name='陳大同';

-- 訂單 2: 林小美
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'林小美','Line',1860,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','A',2,400 FROM o UNION ALL SELECT id,'水蜜桃','C',4,180 FROM o;
UPDATE customers SET total_spent = total_spent + 1860, last_order_date = NOW() WHERE name='林小美';

-- 訂單 3: 王阿強
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'王阿強','Phone',2960,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','B',4,250 FROM o UNION ALL SELECT id,'水蜜桃','A',4,320 FROM o;
UPDATE customers SET total_spent = total_spent + 2960, last_order_date = NOW() WHERE name='王阿強';

-- 訂單 4: 張三
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'張三','Wholesale',5400,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','C',10,150 FROM o UNION ALL SELECT id,'梨子','C',12,120 FROM o;
UPDATE customers SET total_spent = total_spent + 5400, last_order_date = NOW() WHERE name='張三';

-- 訂單 5: 李四
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'李四','Direct',1450,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','B',2,280 FROM o UNION ALL SELECT id,'蜜蘋果','A',1,350 FROM o UNION ALL SELECT id,'梨子','C',5,120 FROM o;
UPDATE customers SET total_spent = total_spent + 1450, last_order_date = NOW() WHERE name='李四';

-- 訂單 6: 羅十
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'羅十','Phone',1720,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','B',3,280 FROM o UNION ALL SELECT id,'蜜蘋果','C',4,150 FROM o;
UPDATE customers SET total_spent = total_spent + 1720, last_order_date = NOW() WHERE name='羅十';

-- 訂單 7: 鄭十一
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'鄭十一','Line',3220,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'柿子','A',6,320 FROM o UNION ALL SELECT id,'蜜蘋果','B',4,250 FROM o;
UPDATE customers SET total_spent = total_spent + 3220, last_order_date = NOW() WHERE name='鄭十一';

-- 訂單 8: 吳十六
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'吳十六','Direct',1980,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','A',2,350 FROM o UNION ALL SELECT id,'梨子','B',4,220 FROM o;
UPDATE customers SET total_spent = total_spent + 1980, last_order_date = NOW() WHERE name='吳十六';

-- 訂單 9: 孫十七
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'孫十七','Line',1520,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','A',1,400 FROM o UNION ALL SELECT id,'水蜜桃','C',4,180 FROM o;
UPDATE customers SET total_spent = total_spent + 1520, last_order_date = NOW() WHERE name='孫十七';

-- =====================================================================
-- VIP 客戶的額外訂單（讓總消費 >= 10000）
-- =====================================================================

-- 王阿強的額外訂單（訂單 10 & 11）
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status, created_at)
  VALUES (gen_random_uuid(),'王阿強','Phone',3850,'Completed', NOW() - INTERVAL '30 days') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','A',8,400 FROM o UNION ALL SELECT id,'蜜蘋果','A',2,350 FROM o;
UPDATE customers SET total_spent = total_spent + 3850, last_order_date = NOW() - INTERVAL '30 days' WHERE name='王阿強';

WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status, created_at)
  VALUES (gen_random_uuid(),'王阿強','Phone',4200,'Completed', NOW() - INTERVAL '45 days') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'柿子','A',10,320 FROM o UNION ALL SELECT id,'梨子','A',4,250 FROM o;
UPDATE customers SET total_spent = total_spent + 4200, last_order_date = NOW() - INTERVAL '30 days' WHERE name='王阿強';

-- 張三的額外訂單（訂單 12）
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status, created_at)
  VALUES (gen_random_uuid(),'張三','Wholesale',6800,'Completed', NOW() - INTERVAL '35 days') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','C',30,180 FROM o UNION ALL SELECT id,'蜜蘋果','C',8,150 FROM o;
UPDATE customers SET total_spent = total_spent + 6800, last_order_date = NOW() - INTERVAL '35 days' WHERE name='張三';

-- 鄭十一的額外訂單（訂單 13 & 14）
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status, created_at)
  VALUES (gen_random_uuid(),'鄭十一','Line',4280,'Completed', NOW() - INTERVAL '40 days') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','A',8,350 FROM o UNION ALL SELECT id,'梨子','A',6,230 FROM o;
UPDATE customers SET total_spent = total_spent + 4280, last_order_date = NOW() - INTERVAL '40 days' WHERE name='鄭十一';

WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status, created_at)
  VALUES (gen_random_uuid(),'鄭十一','Line',3720,'Completed', NOW() - INTERVAL '50 days') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','A',6,400 FROM o UNION ALL SELECT id,'柿子','A',5,320 FROM o;
UPDATE customers SET total_spent = total_spent + 3720, last_order_date = NOW() - INTERVAL '40 days' WHERE name='鄭十一';

-- =====================================================================
-- 農務日誌（12 筆橫跨多個地塊的作業記錄）
-- =====================================================================

INSERT INTO logs (date, plot_id, activity, crop_type, notes, cost, worker) VALUES
 (NOW() - INTERVAL '21 days', (SELECT id FROM plots WHERE name='北坡一號'), 'Fertilize', '水蜜桃', '底肥施用，依土壤檢測配方', 3000, '阿德'),
 (NOW() - INTERVAL '18 days', (SELECT id FROM plots WHERE name='北坡一號'), 'Pesticide', '水蜜桃', '針對病蟲進行低劑量施藥', 1800, '小芳'),
 (NOW() - INTERVAL '14 days', (SELECT id FROM plots WHERE name='北坡一號'), 'Pruning', '水蜜桃', '修剪病枝並改善通風', 1200, '阿德'),
 (NOW() - INTERVAL '10 days', (SELECT id FROM plots WHERE name='南坡二號'), 'Weeding', '柿子', '人工除草沿行間', 800, '小張'),
 (NOW() - INTERVAL '7 days',  (SELECT id FROM plots WHERE name='南坡二號'), 'Bagging',  '柿子', '果實套袋保護', 1500, '小張'),
 (NOW() - INTERVAL '5 days',  (SELECT id FROM plots WHERE name='河畔區'),   'Pesticide', '梨子',   '夜間防治粉蚧', 1600, '阿德'),
 (NOW() - INTERVAL '3 days',  (SELECT id FROM plots WHERE name='河畔區'),   'Harvest',   '梨子',   '分批採收 300kg', 0,    '全員'),
 (NOW() - INTERVAL '2 days',  (SELECT id FROM plots WHERE name='東側試驗田'), 'AIAdvice',  '蜜蘋果', 'AI 建議：加強灌溉管理與葉面追肥', 0, 'AI'),
 (NOW() - INTERVAL '1 days',  (SELECT id FROM plots WHERE name='南坡二號'), 'Pruning',  '柿子', '修剪徒長枝，提升通風與光照', 900, '小張'),
 (NOW() - INTERVAL '12 days', (SELECT id FROM plots WHERE name='東側試驗田'), 'Weeding',  '蜜蘋果', '除草並鋪設覆蓋物', 700, '阿德'),
 (NOW() - INTERVAL '11 days', (SELECT id FROM plots WHERE name='東側試驗田'), 'Pesticide','蜜蘋果','低劑量生物性防治', 900, '小芳'),
 (NOW() - INTERVAL '9 days',  (SELECT id FROM plots WHERE name='西側老園'),   'Pruning',  '柿子','修剪更新樹勢', 1300, '全員');

COMMIT;

-- =====================================================================
-- 資料驗證查詢（可選）
-- =====================================================================

-- 檢查各表資料筆數
-- SELECT 
--   'product_grades' AS table_name, COUNT(*) AS row_count FROM product_grades UNION ALL
-- SELECT 'storage_locations', COUNT(*) FROM storage_locations UNION ALL
-- SELECT 'plots', COUNT(*) FROM plots UNION ALL
-- SELECT 'customers', COUNT(*) FROM customers UNION ALL
-- SELECT 'orders', COUNT(*) FROM orders UNION ALL
-- SELECT 'order_items', COUNT(*) FROM order_items UNION ALL
-- SELECT 'inventory', COUNT(*) FROM inventory UNION ALL
-- SELECT 'logs', COUNT(*) FROM logs;

-- 檢查 VIP 客戶消費總額
-- SELECT name, segment, total_spent, last_order_date
-- FROM customers
-- WHERE total_spent >= 10000
-- ORDER BY total_spent DESC;

-- 檢查庫存摘要
-- SELECT * FROM v_inventory_summary ORDER BY product_name;
