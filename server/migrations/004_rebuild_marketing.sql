-- Rebuild FruitOPS schema for inventory aging + orders + RFM customers
-- Safe to rerun: drops then recreates with sample data

-- Extensions
create extension if not exists pgcrypto;

-- Drop existing tables (order matters due to FKs)
drop table if exists campaign_events cascade;
drop table if exists campaigns cascade;
drop table if exists shipments cascade;
drop table if exists production_forecasts cascade;
drop table if exists harvests cascade;
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists inventory cascade;
drop table if exists storage_locations cascade;
drop table if exists logs cascade;
drop table if exists plots cascade;
drop table if exists customers cascade;
drop table if exists product_grades cascade;

-- Customers: RFM + preferred channel
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phone text,
  region text,
  segment text check (segment in ('VIP','Stable','Regular','New','At Risk')) default 'Regular',
  total_spent numeric default 0,
  last_order_date date,
  preferred_channel text check (preferred_channel in ('Direct','Line','Phone','Wholesale'))
);

-- Orders + Items
create table orders (
  id text primary key,
  customer_name text not null,
  channel text check (channel in ('Direct','Line','Phone','Wholesale')) not null,
  source text check (source in ('GoogleForm','LINE','Phone','Fax','WalkIn','Other')) default 'Other',
  total numeric not null default 0,
  payment_status text check (payment_status in ('Unpaid','Paid','Refunded','Partial')) not null default 'Unpaid',
  status text check (status in ('Pending','Confirmed','Shipped','Completed','Cancelled')) not null default 'Pending',
  created_at timestamp with time zone default now()
);

create table order_items (
  id bigserial primary key,
  order_id text not null references orders(id) on delete cascade,
  product_name text not null,
  grade text not null,
  origin_plot_id text,
  quantity integer not null,
  price numeric not null default 0
);

-- Storage locations
create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('Cold','Ambient','Display')) not null
);

-- Inventory (multi-location)
create table inventory (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  grade text not null,
  quantity integer not null,
  harvest_date date,
  package_spec text,
  batch_id text,
  origin_plot_id text,
  location_id uuid not null references storage_locations(id) on delete cascade
);

-- Plots + Farm logs
create table plots (
  id text primary key,
  name text not null,
  crop text not null,
  area numeric,
  status text check (status in ('Active','Maintenance','Fallow')) not null default 'Active',
  health integer not null default 70
);

create table logs (
  id text primary key,
  date timestamp with time zone not null,
  plot_id text not null references plots(id) on delete cascade,
  activity text not null,
  crop_type text,
  notes text,
  cost numeric default 0,
  worker text
);

-- Product grades (simple mapping)
create table product_grades (
  id bigserial primary key,
  product_name text not null unique,
  grades jsonb not null
);

-- Harvest records (per plot for yield tracking)
create table harvests (
  id bigserial primary key,
  plot_id text not null references plots(id) on delete cascade,
  product_name text not null,
  grade text,
  quantity integer not null,
  harvested_at date not null
);

-- Production forecasts (供需預估的生產端)
create table production_forecasts (
  id bigserial primary key,
  plot_id text references plots(id) on delete cascade,
  product_name text not null,
  expected_quantity integer not null,
  forecast_week date not null,
  note text
);

-- Shipment schedule / priorities
create table shipments (
  id bigserial primary key,
  order_id text not null references orders(id) on delete cascade,
  priority integer not null default 5,
  scheduled_date date,
  status text check (status in ('Planned','Packed','Shipped','Cancelled')) not null default 'Planned'
);

-- Campaigns & Events for marketing automation + ROI tracking
create table campaigns (
  id bigserial primary key,
  name text not null,
  channel text check (channel in ('Email','LINE','SMS')) not null,
  audience_segment text check (audience_segment in ('VIP','Stable','Regular','New','At Risk')),
  schedule_at timestamp with time zone,
  message text
);

create table campaign_events (
  id bigserial primary key,
  campaign_id bigint not null references campaigns(id) on delete cascade,
  customer_name text,
  event_type text check (event_type in ('Sent','Opened','Clicked','Converted')) not null,
  occurred_at timestamp with time zone default now()
);

-- Sample data ---------------------------------------------------------------

-- Customers
insert into customers (name, phone, segment, total_spent, last_order_date, preferred_channel) values
  ('王小明', '0912345678', 'VIP', 120000, current_date - interval '15 days', 'Direct'),
  ('李麗華', '0922333444', 'Stable', 65000, current_date - interval '40 days', 'Phone'),
  ('陳阿華', '0933556677', 'Regular', 28000, current_date - interval '10 days', 'Line'),
  ('林小美', '0966778899', 'At Risk', 15000, current_date - interval '210 days', 'Phone'),
  ('張三', '0955111222', 'New', 0, null, 'Wholesale');

-- Product grades
insert into product_grades (product_name, grades) values
  ('蜜桃', '["A","B","C"]'::jsonb),
  ('水蜜桃', '["A","B","C"]'::jsonb),
  ('黃金桃', '["A","B","C"]'::jsonb),
  ('柿子', '["A","B"]'::jsonb);

-- Storage locations
insert into storage_locations (name, type) values
  ('冷藏一區', 'Cold'),
  ('常溫倉', 'Ambient'),
  ('展示櫃', 'Display');

-- Inventory with harvest_date to exercise aging
insert into inventory (product_name, grade, quantity, harvest_date, location_id)
select '蜜桃','A',120,current_date - interval '18 days', id from storage_locations where name='冷藏一區';
insert into inventory (product_name, grade, quantity, harvest_date, location_id)
select '蜜桃','B',80,current_date - interval '22 days', id from storage_locations where name='常溫倉';
insert into inventory (product_name, grade, quantity, harvest_date, location_id)
select '水蜜桃','A',60,current_date - interval '7 days', id from storage_locations where name='冷藏一區';
insert into inventory (product_name, grade, quantity, harvest_date, location_id)
select '黃金桃','C',200,current_date - interval '30 days', id from storage_locations where name='展示櫃';
insert into inventory (product_name, grade, quantity, harvest_date, location_id)
select '柿子','A',50,current_date - interval '12 days', id from storage_locations where name='常溫倉';

-- Plots
insert into plots (id, name, crop, area, status, health) values
  ('P-001','北坡一','蜜桃',1.2,'Active',86),
  ('P-002','南坡二','水蜜桃',0.8,'Maintenance',62),
  ('P-003','西坡三','黃金桃',1.0,'Active',74);

-- Logs including AIAdvice entries
insert into logs (id, date, plot_id, activity, crop_type, notes, cost, worker) values
  ('L-1001', now() - interval '3 days', 'P-001', 'Fertilize', '蜜桃', '施肥：有機混合肥 20kg', 1200, '阿宏'),
  ('L-1002', now() - interval '1 days', 'P-002', 'Weeding', '水蜜桃', '除草：北側行需要加強', 600, '小美'),
  ('AI-001', now() - interval '0 days', 'P-001', 'AIAdvice', '蜜桃', 'AI 建議：本週灌溉 2 次並加強病蟲監測。', 0, 'AI');

-- Orders + Items
insert into orders (id, customer_name, channel, total, status, created_at) values
  ('DIRECT-ABCD-20251219', '王小明', 'Direct', 3200, 'Pending', now() - interval '1 days'),
  ('PHONE-EFGH-20251218', '李麗華', 'Phone', 2800, 'Confirmed', now() - interval '2 days');

insert into order_items (order_id, product_name, grade, quantity, price) values
  ('DIRECT-ABCD-20251219','蜜桃','A',4,800),
  ('DIRECT-ABCD-20251219','水蜜桃','A',2,400),
  ('PHONE-EFGH-20251218','黃金桃','C',10,120);

-- Harvests sample
insert into harvests (plot_id, product_name, grade, quantity, harvested_at) values
  ('P-001','蜜桃','A',180,current_date - interval '16 days'),
  ('P-002','水蜜桃','A',90,current_date - interval '8 days');

-- Production forecasts sample
insert into production_forecasts (plot_id, product_name, expected_quantity, forecast_week, note) values
  ('P-001','蜜桃',200,date_trunc('week', current_date + interval '14 days')::date,'下週估採 200 箱'),
  ('P-003','黃金桃',150,date_trunc('week', current_date + interval '21 days')::date,'估產量受天氣影響略降');

-- Campaigns + events sample
insert into campaigns (name, channel, audience_segment, schedule_at, message) values
  ('春季預購 EDM','Email','VIP', now() + interval '10 days','春季蜜桃禮盒預購開跑！'),
  ('挽回訊息','LINE','At Risk', now() + interval '2 days','好久不見，回來看看本季限定優惠！');

insert into campaign_events (campaign_id, customer_name, event_type) values
  (1,'王小明','Sent'),
  (1,'王小明','Opened'),
  (1,'王小明','Clicked'),
  (2,'林小美','Sent');

-- Shipments sample
insert into shipments (order_id, priority, scheduled_date, status) values
  ('DIRECT-ABCD-20251219', 3, current_date + interval '1 days', 'Planned'),
  ('PHONE-EFGH-20251218', 5, current_date + interval '2 days', 'Planned');

-- Done