import { query } from './config.js';

const migrateDineIn = async () => {
  try {
    console.log('🚀 Starting dine-in migration...');

    // Add waiter and cook to user_role enum
    await query(`
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'waiter';
    `);
    
    await query(`
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cook';
    `);

    // Create table_status enum
    await query(`
      DO $$ BEGIN
        CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'billing');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create dine_in_order_status enum
    await query(`
      DO $$ BEGIN
        CREATE TYPE dine_in_order_status AS ENUM ('active', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create dine_in_item_status enum
    await query(`
      DO $$ BEGIN
        CREATE TYPE dine_in_item_status AS ENUM ('pending', 'preparing', 'ready', 'served');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Restaurant tables
    await query(`
      CREATE TABLE IF NOT EXISTS restaurant_tables (
        id SERIAL PRIMARY KEY,
        table_number VARCHAR(10) UNIQUE NOT NULL,
        capacity INT NOT NULL DEFAULT 4,
        status table_status DEFAULT 'available',
        floor VARCHAR(50) DEFAULT 'Ground Floor',
        position_x INT DEFAULT 0,
        position_y INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Dine-in orders (one per table session)
    await query(`
      CREATE TABLE IF NOT EXISTS dine_in_orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        table_id INT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
        waiter_id INT REFERENCES users(id) ON DELETE SET NULL,
        customer_name VARCHAR(100),
        customer_phone VARCHAR(20),
        guest_count INT DEFAULT 1,
        status dine_in_order_status DEFAULT 'active',
        subtotal DECIMAL(10, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) DEFAULT 0,
        payment_method VARCHAR(50),
        payment_status payment_status DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);

    // Dine-in order items
    await query(`
      CREATE TABLE IF NOT EXISTS dine_in_order_items (
        id SERIAL PRIMARY KEY,
        dine_in_order_id INT REFERENCES dine_in_orders(id) ON DELETE CASCADE,
        menu_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
        item_name VARCHAR(200) NOT NULL,
        item_price DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        status dine_in_item_status DEFAULT 'pending',
        special_instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ready_at TIMESTAMP,
        served_at TIMESTAMP
      );
    `);

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON restaurant_tables(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dine_in_orders_table ON dine_in_orders(table_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dine_in_orders_waiter ON dine_in_orders(waiter_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dine_in_orders_status ON dine_in_orders(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dine_in_order_items_order ON dine_in_order_items(dine_in_order_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dine_in_order_items_status ON dine_in_order_items(status);`);

    console.log('✅ Dine-in migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Dine-in migration failed:', error);
    process.exit(1);
  }
};

migrateDineIn();
