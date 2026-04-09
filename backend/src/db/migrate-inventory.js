import { query } from './config.js';

const migrateInventory = async () => {
  try {
    console.log('🚀 Starting inventory database migration...');

    // Create payment status enum for purchases
    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'partial');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create payment method enum
    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'bank');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Inventory items table - master list of all inventory items
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL UNIQUE,
        current_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
        unit VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Purchases table - record all purchase transactions
    await query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        item_id INT REFERENCES inventory_items(id) ON DELETE CASCADE,
        quantity DECIMAL(10, 3) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        supplier_name VARCHAR(200),
        payment_status payment_status DEFAULT 'pending',
        payment_method payment_method NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Daily stock logs - track daily stock movements
    await query(`
      CREATE TABLE IF NOT EXISTS daily_stock_logs (
        id SERIAL PRIMARY KEY,
        item_id INT REFERENCES inventory_items(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        opening_stock DECIMAL(10, 3) NOT NULL DEFAULT 0,
        purchased_today DECIMAL(10, 3) NOT NULL DEFAULT 0,
        used_today DECIMAL(10, 3) NOT NULL DEFAULT 0,
        closing_stock DECIMAL(10, 3) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_id, date)
      );
    `);

    // Create indexes for better performance
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items(name);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_purchases_item ON purchases(item_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_daily_stock_item_date ON daily_stock_logs(item_id, date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_daily_stock_date ON daily_stock_logs(date);`);

    // Create trigger to update updated_at timestamp
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
      CREATE TRIGGER update_inventory_items_updated_at
        BEFORE UPDATE ON inventory_items
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_daily_stock_logs_updated_at ON daily_stock_logs;
      CREATE TRIGGER update_daily_stock_logs_updated_at
        BEFORE UPDATE ON daily_stock_logs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Inventory migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Inventory migration failed:', error);
    process.exit(1);
  }
};

migrateInventory();