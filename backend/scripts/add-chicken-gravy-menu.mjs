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
  ['Chicken Lapeta', 150],
  ['Chicken Curry', 120],
  ['Butter Chicken', 180],
];

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categoryName = 'Chicken Gravy';
    const categorySlug = slugify(categoryName);

    const categoryResult = await client.query(
      `INSERT INTO categories (name, slug, description, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug)
       DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [categoryName, categorySlug, 'Chicken gravy dishes', 6]
    );

    const categoryId = categoryResult.rows[0].id;

    for (const [name, price] of menuItems) {
      const slug = slugify(name);
      await client.query(
        `INSERT INTO menu_items (
          category_id, name, slug, description, price,
          is_veg, is_bestseller, spice_level, prep_time_minutes, is_available
        ) VALUES ($1, $2, $3, $4, $5, false, false, 3, 20, true)
        ON CONFLICT (slug)
        DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          category_id = EXCLUDED.category_id,
          description = EXCLUDED.description,
          is_available = true,
          updated_at = CURRENT_TIMESTAMP`,
        [categoryId, name, slug, name, price]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Chicken Gravy menu added successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to add Chicken Gravy menu:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
