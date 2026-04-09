import dotenv from 'dotenv';
import pool from './src/db/config.js';

dotenv.config();

const fixInventorySchema = async () => {
  try {
    console.log('🔧 Fixing inventory table schema...');
    
    // Rename current_quantity to current_stock
    await pool.query(`
      ALTER TABLE inventory_items 
      RENAME COLUMN current_quantity TO current_stock
    `);
    
    // Add min_threshold column if it doesn't exist
    await pool.query(`
      ALTER TABLE inventory_items 
      ADD COLUMN IF NOT EXISTS min_threshold DECIMAL(10,2) DEFAULT 5
    `);
    
    console.log('✅ Schema updated successfully!');
    
    // Add sample inventory items
    await pool.query(`
      INSERT INTO inventory_items (name, current_stock, unit, min_threshold) VALUES
      ('Rice', 50.0, 'kg', 5.0),
      ('Chicken', 20.0, 'kg', 3.0),
      ('Onions', 15.0, 'kg', 2.0),
      ('Tomatoes', 10.0, 'kg', 2.0),
      ('Oil', 5.0, 'litre', 1.0)
      ON CONFLICT (name) DO NOTHING
    `);
    
    console.log('✅ Sample data added!');
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
  } finally {
    await pool.end();
  }
};

fixInventorySchema();