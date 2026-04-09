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

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

const menuItems = [
  ['Mattha', 15],
];

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categoryName = 'Drinks';
    const categorySlug = slugify(categoryName);

    const categoryResult = await client.query(
      `INSERT INTO categories (name, slug, description, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug)
       DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [categoryName, categorySlug, 'Beverages and drinks', 7]
    );

    const categoryId = categoryResult.rows[0].id;

    for (const [name, price] of menuItems) {
      const slug = slugify(name);
      await client.query(
        `INSERT INTO menu_items (
          category_id, name, slug, description, price,
          is_veg, is_bestseller, spice_level, prep_time_minutes, is_available
        ) VALUES ($1, $2, $3, $4, $5, true, false, 1, 5, true)
        ON CONFLICT (slug)
        DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          category_id = EXCLUDED.category_id,
          description = EXCLUDED.description,
          is_veg = true,
          is_available = true,
          updated_at = CURRENT_TIMESTAMP`,
        [categoryId, name, slug, name, price]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Drinks menu added successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to add Drinks menu:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
