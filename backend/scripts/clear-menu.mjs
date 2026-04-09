import pkg from 'pg';

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM cart_items');
    await client.query('DELETE FROM menu_items');
    await client.query('DELETE FROM categories');
    await client.query('COMMIT');
    console.log('✅ Menu categories and items cleared successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clear menu:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
