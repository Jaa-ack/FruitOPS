-- 007_recreate_schema_and_seed_full.sql
-- Recreate core tables with safe defaults and richer seed data.
-- Includes: plots, customers, orders, order_items, inventory, storage_locations, logs, product_grades, view v_inventory_summary

BEGIN;

-- Ensure uuid generation is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop dependent views first
DROP VIEW IF EXISTS v_inventory_summary;

-- Drop tables in dependency order
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS storage_locations CASCADE;
DROP TABLE IF EXISTS plots CASCADE;
DROP TABLE IF EXISTS product_grades CASCADE;

-- =====================================================================
-- Schema
-- =====================================================================

-- Product grades
CREATE TABLE product_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL UNIQUE,
  grades TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Storage locations
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plots
CREATE TABLE plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  crop TEXT NOT NULL,
  area NUMERIC,
  status TEXT NOT NULL,
  health INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  phone TEXT,
  region TEXT,
  preferred_channel TEXT,
  segment TEXT,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  channel TEXT,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  origin_plot_id UUID NULL REFERENCES plots(id)
);

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE RESTRICT,
  harvest_date DATE,
  package_spec TEXT,
  batch_id TEXT,
  origin_plot_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Logs
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

-- Summary view
CREATE VIEW v_inventory_summary AS
SELECT
  product_name,
  SUM(quantity) AS total_quantity,
  COUNT(DISTINCT grade) AS grade_count,
  COUNT(DISTINCT location_id) AS location_count
FROM inventory
GROUP BY product_name;

-- =====================================================================
-- Seed data (richer set)
-- =====================================================================

-- Product grades
INSERT INTO product_grades (product_name, grades) VALUES
  ('水蜜桃', ARRAY['A','B','C']),
  ('蜜蘋果', ARRAY['A','B','C']),
  ('柿子',   ARRAY['A','B']),
  ('梨子',   ARRAY['A','B','C'])
ON CONFLICT (product_name) DO UPDATE SET grades = EXCLUDED.grades;

-- Storage locations
INSERT INTO storage_locations (name, type) VALUES
  ('冷藏一號', 'Cold'),
  ('常溫倉', 'Ambient'),
  ('門市展示', 'Retail'),
  ('批發運輸', 'Transit')
ON CONFLICT (name) DO NOTHING;

-- Plots
INSERT INTO plots (name, crop, area, status, health) VALUES
  ('北坡一號', '水蜜桃', 0.8, 'Active', 88),
  ('南坡二號', '柿子',   0.6, 'Maintenance', 72),
  ('河畔區',   '梨子',   1.2, 'Active', 90),
  ('東側試驗田', '蜜蘋果', 0.4, 'Active', 75),
  ('西側老園',   '柿子',   1.0, 'Maintenance', 65)
ON CONFLICT (name) DO NOTHING;

-- Customers (20)
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

-- Helper to fetch location ids
WITH loc AS (
  SELECT name, id FROM storage_locations
)
-- Inventory (more rows across locations and grades)
INSERT INTO inventory (product_name, grade, quantity, location_id, harvest_date, package_spec, batch_id, origin_plot_id)
SELECT '水蜜桃','A',120,(SELECT id FROM loc WHERE name='冷藏一號'), CURRENT_DATE - INTERVAL '5 days','2kg 禮盒','BATCH-SMA-001',(SELECT id FROM plots WHERE name='北坡一號') UNION ALL
SELECT '水蜜桃','B',200,(SELECT id FROM loc WHERE name='常溫倉'), CURRENT_DATE - INTERVAL '8 days','散裝10kg','BATCH-SMB-001',(SELECT id FROM plots WHERE name='北坡一號') UNION ALL
SELECT '水蜜桃','C',150,(SELECT id FROM loc WHERE name='門市展示'), CURRENT_DATE - INTERVAL '2 days','1kg 小盒','BATCH-SMC-002',(SELECT id FROM plots WHERE name='北坡一號') UNION ALL
SELECT '蜜蘋果','A',80,(SELECT id FROM loc WHERE name='冷藏一號'), CURRENT_DATE - INTERVAL '4 days','2kg 禮盒','BATCH-MA-003',(SELECT id FROM plots WHERE name='東側試驗田') UNION ALL
SELECT '蜜蘋果','B',140,(SELECT id FROM loc WHERE name='門市展示'), CURRENT_DATE - INTERVAL '3 days','1kg 小盒','BATCH-MB-004',(SELECT id FROM plots WHERE name='東側試驗田') UNION ALL
SELECT '蜜蘋果','C',220,(SELECT id FROM loc WHERE name='常溫倉'), CURRENT_DATE - INTERVAL '10 days','散裝10kg','BATCH-MC-005',(SELECT id FROM plots WHERE name='東側試驗田') UNION ALL
SELECT '柿子','A',90,(SELECT id FROM loc WHERE name='冷藏一號'), CURRENT_DATE - INTERVAL '6 days','2kg 禮盒','BATCH-KA-006',(SELECT id FROM plots WHERE name='南坡二號') UNION ALL
SELECT '柿子','B',160,(SELECT id FROM loc WHERE name='常溫倉'), CURRENT_DATE - INTERVAL '9 days','散裝10kg','BATCH-KB-007',(SELECT id FROM plots WHERE name='南坡二號') UNION ALL
SELECT '梨子','A',110,(SELECT id FROM loc WHERE name='冷藏一號'), CURRENT_DATE - INTERVAL '7 days','2kg 禮盒','BATCH-PA-008',(SELECT id FROM plots WHERE name='河畔區') UNION ALL
SELECT '梨子','B',180,(SELECT id FROM loc WHERE name='常溫倉'), CURRENT_DATE - INTERVAL '5 days','散裝10kg','BATCH-PB-009',(SELECT id FROM plots WHERE name='河畔區') UNION ALL
SELECT '梨子','C',200,(SELECT id FROM loc WHERE name='批發運輸'), CURRENT_DATE - INTERVAL '1 day','散裝20kg','BATCH-PC-010',(SELECT id FROM plots WHERE name='河畔區');

-- Orders + items (15 orders)
-- Using CTEs to bind generated order IDs
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'陳大同','Direct',2350,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','A',3,350 FROM o UNION ALL SELECT id,'梨子','B',5,220 FROM o;
UPDATE customers SET total_spent = total_spent + 2350, last_order_date = NOW() WHERE name='陳大同';

WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'林小美','Line',1860,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','A',2,400 FROM o UNION ALL SELECT id,'水蜜桃','C',4,180 FROM o;
UPDATE customers SET total_spent = total_spent + 1860, last_order_date = NOW() WHERE name='林小美';

WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'王阿強','Phone',2960,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','B',4,250 FROM o UNION ALL SELECT id,'水蜜桃','A',4,320 FROM o;
UPDATE customers SET total_spent = total_spent + 2960, last_order_date = NOW() WHERE name='王阿強';

WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'張三','Wholesale',5400,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','C',10,150 FROM o UNION ALL SELECT id,'梨子','C',12,120 FROM o;
UPDATE customers SET total_spent = total_spent + 5400, last_order_date = NOW() WHERE name='張三';

WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'李四','Direct',1450,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','B',2,280 FROM o UNION ALL SELECT id,'蜜蘋果','A',1,350 FROM o UNION ALL SELECT id,'梨子','C',5,120 FROM o;
UPDATE customers SET total_spent = total_spent + 1450, last_order_date = NOW() WHERE name='李四';

-- ... add 10 more orders similar to above for richer dataset
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'羅十','Phone',1720,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','B',3,280 FROM o UNION ALL SELECT id,'蜜蘋果','C',4,150 FROM o;
UPDATE customers SET total_spent = total_spent + 1720, last_order_date = NOW() WHERE name='羅十';

WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'鄭十一','Line',3220,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'柿子','A',6,320 FROM o UNION ALL SELECT id,'蜜蘋果','B',4,250 FROM o;
UPDATE customers SET total_spent = total_spent + 3220, last_order_date = NOW() WHERE name='鄭十一';

WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'吳十六','Direct',1980,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','A',2,350 FROM o UNION ALL SELECT id,'梨子','B',4,220 FROM o;
UPDATE customers SET total_spent = total_spent + 1980, last_order_date = NOW() WHERE name='吳十六';

WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status)
  VALUES (gen_random_uuid(),'孫十七','Line',1520,'Completed') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'蜜蘋果','A',1,400 FROM o UNION ALL SELECT id,'水蜜桃','C',4,180 FROM o;
UPDATE customers SET total_spent = total_spent + 1520, last_order_date = NOW() WHERE name='孫十七';

-- 新增三位高消費客戶的訂單 (總消費額 >= 10000)
-- 客戶1: 王阿強 (額外訂單讓其總消費超過10000)
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

-- 客戶2: 張三 (額外訂單讓其總消費超過10000)
WITH o AS (
  INSERT INTO orders (id, customer_name, channel, total, status, created_at)
  VALUES (gen_random_uuid(),'張三','Wholesale',6800,'Completed', NOW() - INTERVAL '35 days') RETURNING id
)
INSERT INTO order_items (order_id, product_name, grade, quantity, price)
SELECT id,'水蜜桃','C',30,180 FROM o UNION ALL SELECT id,'蜜蘋果','C',8,150 FROM o;
UPDATE customers SET total_spent = total_spent + 6800, last_order_date = NOW() - INTERVAL '35 days' WHERE name='張三';

-- 客戶3: 鄭十一 (額外訂單讓其總消費超過10000)
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

-- Logs (20+ entries across activities)
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
