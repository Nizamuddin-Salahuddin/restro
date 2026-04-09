import dotenv from 'dotenv';
import pool from './src/db/config.js';

dotenv.config();

const testInventoryQuery = async () => {
  try {
    console.log('🔍 Testing inventory query...');
    
    const result = await pool.query(`
      SELECT 
        id, name, current_stock, unit, min_threshold,
        created_at, updated_at
      FROM inventory_items 
      ORDER BY name ASC
    `);
    
    console.log('✅ Query successful!');
    console.log('📊 Results:', JSON.stringify(result.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Query error:', error);
  } finally {
    await pool.end();
  }
};

testInventoryQuery();