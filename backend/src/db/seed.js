import bcrypt from 'bcryptjs';
import { query } from './config.js';

const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await query(`
      INSERT INTO users (name, email, password, phone, role)
      VALUES ('Admin', 'admin@dumandwok.com', $1, '9999999999', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `, [adminPassword]);

    // Create sample delivery boy
    const deliveryPassword = await bcrypt.hash('delivery123', 10);
    await query(`
      INSERT INTO users (name, email, password, phone, role)
      VALUES 
        ('Raju Kumar', 'raju@dumandwok.com', $1, '9876543210', 'delivery'),
        ('Amit Singh', 'amit@dumandwok.com', $1, '9876543211', 'delivery')
      ON CONFLICT (email) DO NOTHING;
    `, [deliveryPassword]);

    // Create sample customer
    const customerPassword = await bcrypt.hash('customer123', 10);
    await query(`
      INSERT INTO users (name, email, password, phone, role, address)
      VALUES ('Test Customer', 'customer@test.com', $1, '9876543212', 'customer', '123, MG Road, Bangalore - 560001')
      ON CONFLICT (email) DO NOTHING;
    `, [customerPassword]);

    // Create categories
    await query(`
      INSERT INTO categories (name, slug, description, sort_order)
      VALUES 
        ('Biryani', 'biryani', 'Authentic Dum Biryani made with finest spices', 1),
        ('Fried Rice', 'fried-rice', 'Wok-tossed aromatic fried rice', 2),
        ('Noodles', 'noodles', 'Hand-pulled noodles with bold flavors', 3),
        ('Starters', 'starters', 'Crispy appetizers to begin your meal', 4),
        ('Manchurian', 'manchurian', 'Indo-Chinese Manchurian specialties', 5),
        ('Soups', 'soups', 'Warm and comforting soups', 6),
        ('Beverages', 'beverages', 'Refreshing drinks', 7)
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Get category IDs
    const categories = await query(`SELECT id, slug FROM categories`);
    const catMap = {};
    categories.rows.forEach(c => catMap[c.slug] = c.id);

    // Seed Menu Items - Biryani
    const biryaniItems = [
      { name: 'Hyderabadi Chicken Dum Biryani', price: 249, veg: false, bestseller: true, spice: 3, time: 30, desc: 'Aromatic basmati rice layered with tender chicken, slow-cooked in traditional Hyderabadi style with saffron and whole spices.' },
      { name: 'Mutton Dum Biryani', price: 349, veg: false, bestseller: true, spice: 3, time: 35, desc: 'Succulent mutton pieces cooked with aged basmati rice, garnished with fried onions and fresh mint.' },
      { name: 'Egg Biryani', price: 179, veg: false, bestseller: false, spice: 2, time: 25, desc: 'Fragrant biryani with perfectly boiled eggs marinated in special spices.' },
      { name: 'Paneer Dum Biryani', price: 199, veg: true, bestseller: true, spice: 2, time: 25, desc: 'Cottage cheese cubes layered with aromatic rice, cooked in dum style with rich gravy.' },
      { name: 'Vegetable Biryani', price: 169, veg: true, bestseller: false, spice: 2, time: 25, desc: 'Mixed seasonal vegetables cooked with fragrant basmati rice and whole spices.' },
    ];

    for (const item of biryaniItems) {
      const slug = item.name.toLowerCase().replace(/\s+/g, '-');
      await query(`
        INSERT INTO menu_items (category_id, name, slug, description, price, is_veg, is_bestseller, spice_level, prep_time_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO NOTHING;
      `, [catMap['biryani'], item.name, slug, item.desc, item.price, item.veg, item.bestseller, item.spice, item.time]);
    }

    // Seed Menu Items - Fried Rice
    const friedRiceItems = [
      { name: 'Chicken Fried Rice', price: 189, veg: false, bestseller: true, spice: 2, time: 15, desc: 'Wok-tossed rice with juicy chicken pieces, vegetables, and our secret sauce.' },
      { name: 'Egg Fried Rice', price: 149, veg: false, bestseller: false, spice: 1, time: 12, desc: 'Classic egg fried rice with scrambled eggs and fresh vegetables.' },
      { name: 'Schezwan Chicken Fried Rice', price: 209, veg: false, bestseller: true, spice: 4, time: 15, desc: 'Fiery Schezwan style fried rice with chicken and bold spices.' },
      { name: 'Veg Fried Rice', price: 139, veg: true, bestseller: false, spice: 1, time: 12, desc: 'Healthy vegetable fried rice with colorful veggies.' },
      { name: 'Paneer Fried Rice', price: 179, veg: true, bestseller: false, spice: 2, time: 15, desc: 'Fried rice with crispy paneer cubes and vegetables.' },
      { name: 'Triple Schezwan Rice', price: 229, veg: false, bestseller: false, spice: 5, time: 18, desc: 'Extra spicy rice with chicken, egg, and prawns in Schezwan sauce.' },
    ];

    for (const item of friedRiceItems) {
      const slug = item.name.toLowerCase().replace(/\s+/g, '-');
      await query(`
        INSERT INTO menu_items (category_id, name, slug, description, price, is_veg, is_bestseller, spice_level, prep_time_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO NOTHING;
      `, [catMap['fried-rice'], item.name, slug, item.desc, item.price, item.veg, item.bestseller, item.spice, item.time]);
    }

    // Seed Menu Items - Noodles
    const noodleItems = [
      { name: 'Hakka Noodles', price: 149, veg: true, bestseller: true, spice: 2, time: 15, desc: 'Stir-fried noodles with vegetables in classic Hakka style.' },
      { name: 'Chicken Hakka Noodles', price: 189, veg: false, bestseller: true, spice: 2, time: 15, desc: 'Hakka noodles loaded with tender chicken strips.' },
      { name: 'Schezwan Noodles', price: 169, veg: true, bestseller: false, spice: 4, time: 15, desc: 'Spicy Schezwan sauce tossed noodles with vegetables.' },
      { name: 'Chilli Garlic Noodles', price: 169, veg: true, bestseller: false, spice: 3, time: 15, desc: 'Aromatic noodles with loads of garlic and green chilies.' },
      { name: 'Singapore Noodles', price: 209, veg: false, bestseller: false, spice: 3, time: 18, desc: 'Curry-flavored noodles with chicken and vegetables.' },
    ];

    for (const item of noodleItems) {
      const slug = item.name.toLowerCase().replace(/\s+/g, '-');
      await query(`
        INSERT INTO menu_items (category_id, name, slug, description, price, is_veg, is_bestseller, spice_level, prep_time_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO NOTHING;
      `, [catMap['noodles'], item.name, slug, item.desc, item.price, item.veg, item.bestseller, item.spice, item.time]);
    }

    // Seed Menu Items - Starters
    const starterItems = [
      { name: 'Chicken 65', price: 229, veg: false, bestseller: true, spice: 4, time: 15, desc: 'Crispy deep-fried chicken with curry leaves and spices.' },
      { name: 'Chilli Chicken', price: 249, veg: false, bestseller: true, spice: 4, time: 18, desc: 'Indo-Chinese style chicken with bell peppers and onions.' },
      { name: 'Dragon Chicken', price: 269, veg: false, bestseller: false, spice: 5, time: 20, desc: 'Fiery crispy chicken in dragon sauce.' },
      { name: 'Paneer 65', price: 199, veg: true, bestseller: false, spice: 3, time: 15, desc: 'Crispy paneer cubes with South Indian spices.' },
      { name: 'Crispy Corn', price: 149, veg: true, bestseller: true, spice: 2, time: 12, desc: 'Golden fried corn kernels with pepper and spices.' },
      { name: 'Spring Rolls (4 pcs)', price: 129, veg: true, bestseller: false, spice: 1, time: 10, desc: 'Crispy rolls stuffed with vegetables.' },
      { name: 'Chicken Momos (6 pcs)', price: 149, veg: false, bestseller: true, spice: 2, time: 15, desc: 'Steamed dumplings filled with minced chicken.' },
      { name: 'Veg Momos (6 pcs)', price: 119, veg: true, bestseller: false, spice: 1, time: 15, desc: 'Steamed dumplings with mixed vegetable filling.' },
    ];

    for (const item of starterItems) {
      const slug = item.name.toLowerCase().replace(/[\s()]+/g, '-').replace(/-+/g, '-');
      await query(`
        INSERT INTO menu_items (category_id, name, slug, description, price, is_veg, is_bestseller, spice_level, prep_time_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO NOTHING;
      `, [catMap['starters'], item.name, slug, item.desc, item.price, item.veg, item.bestseller, item.spice, item.time]);
    }

    // Seed Menu Items - Manchurian
    const manchurianItems = [
      { name: 'Gobi Manchurian Dry', price: 169, veg: true, bestseller: true, spice: 3, time: 15, desc: 'Crispy cauliflower florets tossed in Manchurian sauce.' },
      { name: 'Gobi Manchurian Gravy', price: 179, veg: true, bestseller: false, spice: 3, time: 18, desc: 'Cauliflower balls in rich Manchurian gravy.' },
      { name: 'Chicken Manchurian Dry', price: 229, veg: false, bestseller: true, spice: 3, time: 18, desc: 'Chicken chunks in dry Manchurian preparation.' },
      { name: 'Chicken Manchurian Gravy', price: 249, veg: false, bestseller: false, spice: 3, time: 20, desc: 'Boneless chicken in thick Manchurian gravy.' },
      { name: 'Veg Manchurian Dry', price: 159, veg: true, bestseller: false, spice: 2, time: 15, desc: 'Mixed vegetable balls in Manchurian sauce.' },
    ];

    for (const item of manchurianItems) {
      const slug = item.name.toLowerCase().replace(/\s+/g, '-');
      await query(`
        INSERT INTO menu_items (category_id, name, slug, description, price, is_veg, is_bestseller, spice_level, prep_time_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO NOTHING;
      `, [catMap['manchurian'], item.name, slug, item.desc, item.price, item.veg, item.bestseller, item.spice, item.time]);
    }

    // Seed Menu Items - Soups
    const soupItems = [
      { name: 'Hot & Sour Soup', price: 99, veg: true, bestseller: true, spice: 3, time: 10, desc: 'Classic tangy and spicy soup with vegetables.' },
      { name: 'Manchow Soup', price: 109, veg: true, bestseller: true, spice: 2, time: 10, desc: 'Thick vegetable soup topped with crispy noodles.' },
      { name: 'Sweet Corn Soup', price: 89, veg: true, bestseller: false, spice: 1, time: 10, desc: 'Creamy sweet corn soup.' },
      { name: 'Chicken Hot & Sour Soup', price: 129, veg: false, bestseller: false, spice: 3, time: 12, desc: 'Hot and sour soup with shredded chicken.' },
      { name: 'Chicken Manchow Soup', price: 139, veg: false, bestseller: false, spice: 2, time: 12, desc: 'Thick chicken soup with crispy noodles.' },
    ];

    for (const item of soupItems) {
      const slug = item.name.toLowerCase().replace(/\s+/g, '-');
      await query(`
        INSERT INTO menu_items (category_id, name, slug, description, price, is_veg, is_bestseller, spice_level, prep_time_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO NOTHING;
      `, [catMap['soups'], item.name, slug, item.desc, item.price, item.veg, item.bestseller, item.spice, item.time]);
    }

    // Seed Menu Items - Beverages
    const beverageItems = [
      { name: 'Masala Chai', price: 39, veg: true, bestseller: false, spice: 1, time: 5, desc: 'Traditional Indian spiced tea.' },
      { name: 'Cold Coffee', price: 79, veg: true, bestseller: true, spice: 1, time: 5, desc: 'Chilled creamy cold coffee.' },
      { name: 'Fresh Lime Soda', price: 49, veg: true, bestseller: false, spice: 1, time: 3, desc: 'Refreshing lime soda - sweet or salted.' },
      { name: 'Mango Lassi', price: 69, veg: true, bestseller: true, spice: 1, time: 5, desc: 'Thick mango yogurt drink.' },
      { name: 'Buttermilk', price: 39, veg: true, bestseller: false, spice: 1, time: 3, desc: 'Cooling spiced buttermilk.' },
    ];

    for (const item of beverageItems) {
      const slug = item.name.toLowerCase().replace(/\s+/g, '-');
      await query(`
        INSERT INTO menu_items (category_id, name, slug, description, price, is_veg, is_bestseller, spice_level, prep_time_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO NOTHING;
      `, [catMap['beverages'], item.name, slug, item.desc, item.price, item.veg, item.bestseller, item.spice, item.time]);
    }

    console.log('✅ Seeding completed successfully!');
    console.log('');
    console.log('📝 Test Accounts Created:');
    console.log('   Admin: admin@dumandwok.com / admin123');
    console.log('   Delivery: raju@dumandwok.com / delivery123');
    console.log('   Customer: customer@test.com / customer123');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
