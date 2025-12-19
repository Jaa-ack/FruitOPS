-- 005_alter_orders_drop_unused.sql
-- Purpose: Remove unused columns from orders now that frontend/backend no longer use them.
-- Safe to run multiple times due to IF EXISTS.

BEGIN;

ALTER TABLE orders DROP COLUMN IF EXISTS source;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;

COMMIT;
