#!/usr/bin/env node

// Production setup script for Railway
import dotenv from 'dotenv';
import { testConnection, pool } from './src/db/config.js';

dotenv.config();

const runProductionSetup = async () => {
  try {
    console.log('🚀 Running production setup...');
    
    // Test connection first
    await testConnection();
    console.log('✅ Database connection successful');
    
    // Check if inventory tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('inventory_items', 'purchases', 'daily_stock_logs')
    `);
    
    if (result.rows.length === 0) {
      console.log('📦 Creating inventory tables...');
      
      // Create inventory tables
      await pool.query(`
        -- Create inventory_items table
        CREATE TABLE IF NOT EXISTS inventory_items (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          current_stock DECIMAL(10,2) DEFAULT 0,
          unit VARCHAR(20) NOT NULL,
          min_threshold DECIMAL(10,2) DEFAULT 5,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create purchases table with enum types
        DO $$ BEGIN
          CREATE TYPE payment_status_enum AS ENUM ('paid', 'pending', 'partial');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE payment_method_enum AS ENUM ('cash', 'upi', 'bank');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS purchases (
          id SERIAL PRIMARY KEY,
          item_name VARCHAR(100) NOT NULL,
          quantity DECIMAL(10,2) NOT NULL,
          unit VARCHAR(20) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          supplier_name VARCHAR(100),
          payment_status payment_status_enum DEFAULT 'pending',
          payment_method payment_method_enum NOT NULL,
          date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create daily_stock_logs table
        CREATE TABLE IF NOT EXISTS daily_stock_logs (
          id SERIAL PRIMARY KEY,
          item_id INTEGER REFERENCES inventory_items(id),
          date DATE NOT NULL,
          opening_stock DECIMAL(10,2) NOT NULL,
          purchased_today DECIMAL(10,2) DEFAULT 0,
          used_today DECIMAL(10,2) DEFAULT 0,
          closing_stock DECIMAL(10,2) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(item_id, date)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
        CREATE INDEX IF NOT EXISTS idx_purchases_item_name ON purchases(item_name);
        CREATE INDEX IF NOT EXISTS idx_daily_stock_logs_date ON daily_stock_logs(date);
        CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);

        -- Create trigger function
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- Create trigger
        DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
        CREATE TRIGGER update_inventory_items_updated_at
          BEFORE UPDATE ON inventory_items
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
      
      console.log('✅ Inventory tables created successfully');
    } else {
      console.log('✅ Inventory tables already exist');
    }
    
    console.log('🎉 Production setup completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Production setup failed:', error);
    process.exit(1);
  }
};

runProductionSetup();