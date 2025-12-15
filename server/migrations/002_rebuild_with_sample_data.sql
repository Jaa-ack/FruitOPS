-- ============================================================================
-- FruitOPS 資料庫完整重建腳本（含虛擬資料）
-- 刪除舊資料 → 建立新結構 → 填充資料
-- ============================================================================

-- 第 1 步：刪除所有舊表與視圖（級聯刪除以避免外鍵阻擋）
DROP VIEW IF EXISTS v_orders_with_details CASCADE;
DROP VIEW IF EXISTS v_inventory_detail CASCADE;
DROP VIEW IF EXISTS v_inventory_summary CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS product_grades CASCADE;
DROP TABLE IF EXISTS storage_locations CASCADE;
DROP TABLE IF EXISTS plots CASCADE;

-- 第 2 步：建立 storage_locations 表（儲位管理）
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT '冷庫',
  capacity INTEGER DEFAULT 1000,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO storage_locations (name, type, capacity, description) VALUES
('冷藏庫 A', '冷庫', 500, '恆溫 2-4°C'),
('冷藏庫 B', '冷庫', 500, '恆溫 2-4°C'),
('倉庫 C', '常溫倉', 1000, '通風乾燥'),
('倉庫 D', '常溫倉', 1000, '通風乾燥');

-- 第 3 步：建立 product_grades 表（水果品級配置）
CREATE TABLE product_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL UNIQUE,
  grades TEXT[] NOT NULL DEFAULT ARRAY['A', 'B', 'C'],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO product_grades (product_name, grades) VALUES
('水梨', ARRAY['A', 'B', 'C']),
('水蜜桃', ARRAY['A', 'B', 'C']),
('蜜蘋果', ARRAY['A', 'B', 'C']),
('柿子', ARRAY['A', 'B']);

-- 第 4 步：建立 plots 表（果園地塊）
CREATE TABLE plots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  crop TEXT NOT NULL,
  area_ha DECIMAL(8, 2) NOT NULL,
  status TEXT DEFAULT 'Active',
  health INTEGER DEFAULT 80,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO plots (id, name, crop, area_ha, status, health) VALUES
('P-01', '山坡區 A', '水蜜桃', 0.5, 'Active', 92),
('P-02', '河畔區', '水梨', 0.8, 'Active', 85),
('P-03', '上層梯田', '蜜蘋果', 0.4, 'Maintenance', 78),
('P-04', '南邊平地', '柿子', 1.2, 'Active', 88);

-- 第 5 步：建立 logs 表（農事日誌）
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  plot_id TEXT NOT NULL REFERENCES plots(id),
  activity TEXT NOT NULL,
  crop_type TEXT DEFAULT '',
  area_ha DECIMAL(8, 2) DEFAULT 0,
  notes TEXT DEFAULT '',
  cost DECIMAL(10, 2) DEFAULT 0,
  worker TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_plot_date ON logs(plot_id, date DESC);

INSERT INTO logs (id, date, plot_id, activity, crop_type, notes, cost, worker) VALUES
('L-101', '2025-12-01', 'P-01', 'Pruning', '水蜜桃', '冬季修剪準備', 2500, '明伯'),
('L-102', '2025-12-02', 'P-02', 'Fertilize', '水梨', '有機堆肥施用', 4000, '美姨'),
('L-103', '2025-12-03', 'P-01', 'Weeding', '水蜜桃', '人工除草', 1500, '臨時工'),
('L-104', '2025-12-05', 'P-03', 'Watering', '蜜蘋果', '灌溉補水', 800, '明伯'),
('L-105', '2025-12-08', 'P-04', 'Inspection', '柿子', '定期檢查', 500, '小王');

-- 第 6 步：建立 inventory 表（庫存管理）
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  location_id UUID REFERENCES storage_locations(id),
  harvest_date DATE,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_name, grade, location_id)
);

CREATE INDEX idx_inventory_product_grade ON inventory(product_name, grade);
CREATE INDEX idx_inventory_location ON inventory(location_id);

-- 水蜜桃庫存（A/B/C 三級）
INSERT INTO inventory (product_name, grade, quantity, location_id, harvest_date) VALUES
('水蜜桃', 'A', 150, (SELECT id FROM storage_locations WHERE name='冷藏庫 A'), '2025-11-20'),
('水蜜桃', 'B', 300, (SELECT id FROM storage_locations WHERE name='冷藏庫 B'), '2025-11-20'),
('水蜜桃', 'C', 80, (SELECT id FROM storage_locations WHERE name='倉庫 C'), '2025-11-20');

-- 水梨庫存（A/B/C 三級）
INSERT INTO inventory (product_name, grade, quantity, location_id, harvest_date) VALUES
('水梨', 'A', 200, (SELECT id FROM storage_locations WHERE name='冷藏庫 A'), '2025-11-15'),
('水梨', 'B', 250, (SELECT id FROM storage_locations WHERE name='冷藏庫 B'), '2025-11-15'),
('水梨', 'C', 120, (SELECT id FROM storage_locations WHERE name='倉庫 D'), '2025-11-15');

-- 蜜蘋果庫存（A/B/C 三級）
INSERT INTO inventory (product_name, grade, quantity, location_id, harvest_date) VALUES
('蜜蘋果', 'A', 180, (SELECT id FROM storage_locations WHERE name='冷藏庫 A'), '2025-10-25'),
('蜜蘋果', 'B', 220, (SELECT id FROM storage_locations WHERE name='倉庫 C'), '2025-10-25'),
('蜜蘋果', 'C', 90, (SELECT id FROM storage_locations WHERE name='倉庫 D'), '2025-10-25');

-- 柿子庫存（A/B 兩級）
INSERT INTO inventory (product_name, grade, quantity, location_id, harvest_date) VALUES
('柿子', 'A', 160, (SELECT id FROM storage_locations WHERE name='倉庫 C'), '2025-11-01'),
('柿子', 'B', 280, (SELECT id FROM storage_locations WHERE name='倉庫 D'), '2025-11-01');

-- 第 7 步：建立 customers 表（客戶管理）
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  segment TEXT DEFAULT 'Regular',
  total_spent DECIMAL(12, 2) DEFAULT 0,
  last_order_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO customers (id, name, phone, segment, total_spent, last_order_date) VALUES
('C-001', '王大明', '0912-345-678', 'VIP', 125000, '2025-12-10'),
('C-002', '林小姐', '0922-111-222', 'Regular', 35000, '2025-12-08'),
('C-003', '台北果菜市場', '02-2222-3333', 'VIP', 850000, '2025-12-12'),
('C-004', '陳氏咖啡店', '0933-444-555', 'Regular', 18000, '2025-12-05'),
('C-005', '新鮮水果坊', '0955-666-777', 'New', 0, NULL);

-- 第 8 步：建立 orders 表（訂單）
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_code TEXT UNIQUE,
  customer_id TEXT REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  channel TEXT DEFAULT 'Direct',
  status TEXT DEFAULT 'Pending',
  total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);

INSERT INTO orders (id, order_code, customer_id, customer_name, channel, status, total) VALUES
('ORD-2025-001', 'ORD20251201001', 'C-001', '王大明', 'Line', 'Completed', 12000),
('ORD-2025-002', 'ORD20251205001', 'C-003', '台北果菜市場', 'Wholesale', 'Completed', 150000),
('ORD-2025-003', 'ORD20251208001', 'C-002', '林小姐', 'Phone', 'Shipped', 8500),
('ORD-2025-004', 'ORD20251210001', 'C-001', '王大明', 'Line', 'Pending', 15000),
('ORD-2025-005', 'ORD20251212001', 'C-004', '陳氏咖啡店', 'Direct', 'Confirmed', 6800);

-- 第 9 步：建立 order_items 表（訂單項目）
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * price) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

INSERT INTO order_items (order_id, product_name, grade, quantity, price) VALUES
-- ORD-2025-001：王大明訂單
('ORD-2025-001', '水蜜桃', 'A', 10, 500),
('ORD-2025-001', '水梨', 'A', 8, 400),

-- ORD-2025-002：台北果菜市場批發訂單
('ORD-2025-002', '水蜜桃', 'B', 200, 350),
('ORD-2025-002', '水梨', 'B', 150, 300),

-- ORD-2025-003：林小姐訂單
('ORD-2025-003', '蜜蘋果', 'A', 5, 600),
('ORD-2025-003', '柿子', 'A', 10, 350),

-- ORD-2025-004：王大明第二筆訂單
('ORD-2025-004', '水蜜桃', 'A', 15, 500),
('ORD-2025-004', '蜜蘋果', 'B', 6, 450),

-- ORD-2025-005：陳氏咖啡店訂單
('ORD-2025-005', '水梨', 'A', 4, 400),
('ORD-2025-005', '蜜蘋果', 'A', 8, 550);

-- 第 10 步：建立視圖（查詢用）

-- 庫存摘要（按產品統計）
CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT 
  product_name,
  SUM(quantity)::INTEGER as total_quantity,
  COUNT(DISTINCT grade)::INTEGER as grade_count,
  COUNT(DISTINCT location_id)::INTEGER as location_count
FROM inventory
WHERE quantity > 0
GROUP BY product_name
ORDER BY product_name;

-- 庫存詳細（含位置）
CREATE OR REPLACE VIEW v_inventory_detail AS
SELECT 
  i.id,
  i.product_name,
  i.grade,
  i.quantity,
  COALESCE(sl.name, '未指定') as location,
  i.location_id,
  i.harvest_date,
  i.last_updated
FROM inventory i
LEFT JOIN storage_locations sl ON i.location_id = sl.id
WHERE i.quantity > 0
ORDER BY i.product_name, i.grade, sl.name;

-- 訂單詳細視圖
CREATE OR REPLACE VIEW v_orders_with_details AS
SELECT 
  o.id,
  o.order_code,
  o.customer_name,
  o.channel,
  o.status,
  o.total,
  o.created_at,
  COUNT(oi.id)::INTEGER as item_count,
  COALESCE(SUM(oi.quantity), 0)::INTEGER as total_quantity
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_code, o.customer_name, o.channel, o.status, o.total, o.created_at;

-- 第 11 步：驗證與統計
SELECT '✅ 資料庫重建完成！' as status;
SELECT '' as separator;

SELECT '📊 表統計：' as section;
SELECT 
  'plots' as table_name, COUNT(*) as count FROM plots
UNION ALL
SELECT 'logs', COUNT(*) FROM logs
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'product_grades', COUNT(*) FROM product_grades
UNION ALL
SELECT 'storage_locations', COUNT(*) FROM storage_locations
ORDER BY table_name;

SELECT '' as separator;

SELECT '🍎 水果品級配置：' as section;
SELECT product_name, grades FROM product_grades ORDER BY product_name;

SELECT '' as separator;

SELECT '📦 庫存摘要：' as section;
SELECT * FROM v_inventory_summary;

SELECT '' as separator;

SELECT '📋 訂單統計：' as section;
SELECT 
  COUNT(*) as total_orders,
  SUM(total)::NUMERIC(12,2) as total_revenue
FROM orders;
