import dotenv from 'dotenv';
import pool from './src/db/config.js';

dotenv.config();

const checkInventoryTable = async () => {
  try {
    console.log('🔍 Checking inventory_items table structure...');
    
    // Get table columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Get row count
    const countResult = await pool.query('SELECT COUNT(*) FROM inventory_items');
    console.log(`📈 Total rows: ${countResult.rows[0].count}`);
    
    // Get sample data
    const sampleResult = await pool.query('SELECT * FROM inventory_items LIMIT 3');
    console.log('📝 Sample data:');
    sampleResult.rows.forEach(row => {
      console.log(`  - ${JSON.stringify(row)}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking table:', error);
  } finally {
    await pool.end();
  }
};

checkInventoryTable();