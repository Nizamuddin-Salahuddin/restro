#!/usr/bin/env node
// Run this to setup inventory tables on production

import dotenv from 'dotenv';
import { pool } from './src/db/config.js';

dotenv.config();

const setupInventoryTables = async () => {
  try {
    console.log('🔧 Setting up inventory tables...');
    
    // Check if tables exist
    const checkResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('inventory_items', 'purchases', 'daily_stock_logs')
    `);
    
    if (checkResult.rows.length === 3) {
      console.log('✅ Inventory tables already exist');
      return;
    }
    
    console.log('📦 Creating inventory tables...');
    
    // Create enum types first
    await pool.query(`
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
    `);
    
    // Create inventory_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        current_stock DECIMAL(10,2) DEFAULT 0,
        unit VARCHAR(20) NOT NULL,
        min_threshold DECIMAL(10,2) DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create purchases table
    await pool.query(`
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
      )
    `);
    
    // Create daily_stock_logs table
    await pool.query(`
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
      )
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
      CREATE INDEX IF NOT EXISTS idx_purchases_item_name ON purchases(item_name);
      CREATE INDEX IF NOT EXISTS idx_daily_stock_logs_date ON daily_stock_logs(date);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
    `);
    
    // Create trigger function for updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create trigger
    await pool.query(`
      DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
      CREATE TRIGGER update_inventory_items_updated_at
        BEFORE UPDATE ON inventory_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Inventory tables created successfully!');
    
    // Add some sample inventory items
    await pool.query(`
      INSERT INTO inventory_items (name, current_stock, unit, min_threshold) VALUES
      ('Rice', 50.0, 'kg', 5.0),
      ('Chicken', 20.0, 'kg', 3.0),
      ('Onions', 15.0, 'kg', 2.0),
      ('Tomatoes', 10.0, 'kg', 2.0),
      ('Oil', 5.0, 'litre', 1.0)
      ON CONFLICT (name) DO NOTHING
    `);
    
    console.log('✅ Sample inventory items added!');
    
  } catch (error) {
    console.error('❌ Error setting up inventory tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

setupInventoryTables()
  .then(() => {
    console.log('🎉 Inventory setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });