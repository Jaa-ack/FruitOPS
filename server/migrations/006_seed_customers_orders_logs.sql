-- 006_seed_customers_orders_logs.sql
-- Purpose: Seed rich customers (>=10 with spending), orders, order_items, plots, and farm logs.
-- Note: Uses CTE with RETURNING to insert order_items tied to generated order IDs.

BEGIN;

-- Seed plots (if empty)
INSERT INTO plots (name, crop, area, status, health)
VALUES
  ('北坡一號', '水蜜桃', '0.8', 'Active', 88),
  ('南坡二號', '黃金桃', '0.6', 'Maintenance', 72),
  ('河畔區', '蜜桃', '1.2', 'Active', 90)
ON CONFLICT DO NOTHING;

-- Seed customers (12+)
INSERT INTO customers (name, phone, region, preferred_channel, segment, total_spent, last_order_date)
VALUES
  ('陳大同', '0912-111-222', '北區', 'Direct', 'Regular', 0, NULL),
  ('林小美', '0922-333-444', '中區', 'Line', 'Stable', 0, NULL),
  ('王阿強', '0933-555-666', '南區', 'Phone', 'VIP', 0, NULL),
  ('張三',    '0955-777-888', '北區', 'Wholesale', 'Regular', 0, NULL),
  ('李四',    '0966-999-000', '中區', 'Direct', 'At Risk', 0, NULL),
  ('吳五',    '0977-000-111', '南區', 'Line', 'Regular', 0, NULL),
  ('周六',    '0988-222-333', '北區', 'Phone', 'Stable', 0, NULL),
  ('許七',    '0999-444-555', '中區', 'Line', 'Regular', 0, NULL),
  ('黃八',    '0910-666-777', '南區', 'Wholesale', 'Regular', 0, NULL),
  ('何九',    '0921-888-999', '北區', 'Direct', 'New', 0, NULL),
  ('羅十',    '0932-111-333', '中區', 'Phone', 'Stable', 0, NULL),
  ('鄭十一',  '0943-222-444', '南區', 'Line', 'VIP', 0, NULL)
ON CONFLICT DO NOTHING;

-- Helper: function to update customer last_order_date and total_spent after each order
-- If your environment restricts function creation, you can ignore this and run a separate UPDATE after all inserts.
-- Here we will perform per-order UPDATE statements.

-- Seed orders and items
-- Order 1 - 陳大同
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('陳大同', 'Direct', 2350, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '蜜桃', 'A', 3, 350 FROM o
UNION ALL SELECT id, '黃金桃', 'B', 5, 220 FROM o;
UPDATE customers SET total_spent = total_spent + 2350, last_order_date = NOW() WHERE name = '陳大同';

-- Order 2 - 林小美
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('林小美', 'Line', 1860, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '水蜜桃', 'A', 2, 400 FROM o
UNION ALL SELECT id, '水蜜桃', 'C', 4, 180 FROM o;
UPDATE customers SET total_spent = total_spent + 1860, last_order_date = NOW() WHERE name = '林小美';

-- Order 3 - 王阿強
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('王阿強', 'Phone', 2960, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '蜜桃', 'B', 4, 250 FROM o
UNION ALL SELECT id, '黃金桃', 'A', 4, 320 FROM o;
UPDATE customers SET total_spent = total_spent + 2960, last_order_date = NOW() WHERE name = '王阿強';

-- Order 4 - 張三
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('張三', 'Wholesale', 5400, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '蜜桃', 'C', 10, 150 FROM o
UNION ALL SELECT id, '黃金桃', 'C', 12, 120 FROM o;
UPDATE customers SET total_spent = total_spent + 5400, last_order_date = NOW() WHERE name = '張三';

-- Order 5 - 李四
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('李四', 'Direct', 1450, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '水蜜桃', 'B', 2, 280 FROM o
UNION ALL SELECT id, '蜜桃', 'A', 1, 350 FROM o
UNION ALL SELECT id, '黃金桃', 'C', 5, 120 FROM o;
UPDATE customers SET total_spent = total_spent + 1450, last_order_date = NOW() WHERE name = '李四';

-- Order 6 - 吳五
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('吳五', 'Line', 1680, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '蜜桃', 'A', 2, 350 FROM o
UNION ALL SELECT id, '水蜜桃', 'C', 5, 180 FROM o;
UPDATE customers SET total_spent = total_spent + 1680, last_order_date = NOW() WHERE name = '吳五';

-- Order 7 - 周六
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('周六', 'Phone', 2140, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '黃金桃', 'A', 3, 320 FROM o
UNION ALL SELECT id, '蜜桃', 'B', 4, 250 FROM o;
UPDATE customers SET total_spent = total_spent + 2140, last_order_date = NOW() WHERE name = '周六';

-- Order 8 - 許七
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('許七', 'Line', 1360, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '水蜜桃', 'A', 2, 400 FROM o
UNION ALL SELECT id, '黃金桃', 'B', 2, 220 FROM o
UNION ALL SELECT id, '蜜桃', 'C', 2, 150 FROM o;
UPDATE customers SET total_spent = total_spent + 1360, last_order_date = NOW() WHERE name = '許七';

-- Order 9 - 黃八
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('黃八', 'Wholesale', 4800, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '蜜桃', 'B', 8, 250 FROM o
UNION ALL SELECT id, '水蜜桃', 'C', 12, 180 FROM o;
UPDATE customers SET total_spent = total_spent + 4800, last_order_date = NOW() WHERE name = '黃八';

-- Order 10 - 何九
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('何九', 'Direct', 950, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '蜜桃', 'A', 1, 350 FROM o
UNION ALL SELECT id, '黃金桃', 'C', 5, 120 FROM o;
UPDATE customers SET total_spent = total_spent + 950, last_order_date = NOW() WHERE name = '何九';

-- Order 11 - 羅十
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('羅十', 'Phone', 1720, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '水蜜桃', 'B', 3, 280 FROM o
UNION ALL SELECT id, '蜜桃', 'C', 4, 150 FROM o;
UPDATE customers SET total_spent = total_spent + 1720, last_order_date = NOW() WHERE name = '羅十';

-- Order 12 - 鄭十一
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('鄭十一', 'Line', 3220, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '黃金桃', 'A', 6, 320 FROM o
UNION ALL SELECT id, '蜜桃', 'B', 4, 250 FROM o;
UPDATE customers SET total_spent = total_spent + 3220, last_order_date = NOW() WHERE name = '鄭十一';

-- (Optional) add more orders to exceed 10 customers with spending
WITH o AS (
  INSERT INTO orders (customer_name, channel, total, status)
  VALUES ('張三', 'Wholesale', 3600, 'Completed')
  RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id, '水蜜桃', 'C', 10, 180 FROM o
UNION ALL SELECT id, '蜜桃', 'C', 12, 150 FROM o;
UPDATE customers SET total_spent = total_spent + 3600, last_order_date = NOW() WHERE name = '張三';

-- Seed rich farm logs
-- Activities: Fertilize, Pesticide, Pruning, Weeding, Bagging, Harvest, AIAdvice
INSERT INTO logs (date, plot_id, activity, crop_type, notes, cost, worker)
VALUES
  (NOW() - INTERVAL '21 days', (SELECT id FROM plots WHERE name='北坡一號' LIMIT 1), 'Fertilize', '水蜜桃', '底肥施用，依土壤檢測配方', 3000, '阿德'),
  (NOW() - INTERVAL '18 days', (SELECT id FROM plots WHERE name='北坡一號' LIMIT 1), 'Pesticide', '水蜜桃', '針對葉蟬進行低劑量施藥', 1800, '小芳'),
  (NOW() - INTERVAL '14 days', (SELECT id FROM plots WHERE name='北坡一號' LIMIT 1), 'Pruning', '水蜜桃', '修剪病枝並改善通風', 1200, '阿德'),
  (NOW() - INTERVAL '10 days', (SELECT id FROM plots WHERE name='南坡二號' LIMIT 1), 'Weeding', '黃金桃', '人工除草沿行間', 800, '小張'),
  (NOW() - INTERVAL '7 days',  (SELECT id FROM plots WHERE name='南坡二號' LIMIT 1), 'Bagging',  '黃金桃', '果實套袋保護', 1500, '小張'),
  (NOW() - INTERVAL '5 days',  (SELECT id FROM plots WHERE name='河畔區'   LIMIT 1), 'Pesticide', '蜜桃',   '夜間防治粉蚧', 1600, '阿德'),
  (NOW() - INTERVAL '3 days',  (SELECT id FROM plots WHERE name='河畔區'   LIMIT 1), 'Harvest',   '蜜桃',   '分批採收 300kg', 0,    '全員'),
  (NOW() - INTERVAL '2 days',  (SELECT id FROM plots WHERE name='北坡一號' LIMIT 1), 'AIAdvice',  '水蜜桃', 'AI 建議：加強灌溉管理與葉面追肥', 0, 'AI'),
  (NOW() - INTERVAL '1 days',  (SELECT id FROM plots WHERE name='南坡二號' LIMIT 1), 'Pruning',  '黃金桃', '修剪徒長枝，提升通風與光照', 900, '小張');

COMMIT;
