-- Add waiters table for PIN-based authentication
CREATE TABLE IF NOT EXISTS waiters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_waiters_tenant ON waiters(tenant_id);
CREATE INDEX idx_waiters_active ON waiters(active);

-- Add trigger for updated_at
CREATE TRIGGER update_waiters_updated_at BEFORE UPDATE ON waiters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update orders table to reference waiters instead of users for waiter acknowledgment
-- First, check if the column exists and modify it
DO $$
BEGIN
  -- Drop the old foreign key constraint if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'orders_waiter_ack_user_id_fkey') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_waiter_ack_user_id_fkey;
  END IF;

  -- Rename the column to waiter_id if it's still named waiter_ack_user_id
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'orders' AND column_name = 'waiter_ack_user_id') THEN
    ALTER TABLE orders RENAME COLUMN waiter_ack_user_id TO waiter_id;
    ALTER TABLE orders ALTER COLUMN waiter_id TYPE UUID USING NULL;
  END IF;

  -- Add the column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'orders' AND column_name = 'waiter_id') THEN
    ALTER TABLE orders ADD COLUMN waiter_id UUID;
  END IF;
END $$;

-- Add foreign key constraint to waiters table
ALTER TABLE orders ADD CONSTRAINT fk_orders_waiter
  FOREIGN KEY (waiter_id) REFERENCES waiters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_waiter ON orders(waiter_id);
