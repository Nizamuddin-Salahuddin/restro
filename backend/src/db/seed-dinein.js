import { query } from './config.js';
import bcrypt from 'bcryptjs';

const seedDineIn = async () => {
  try {
    console.log('🌱 Seeding dine-in data...');

    // Hash password
    const hashedPassword = await bcrypt.hash('staff123', 10);

    // Create waiter user
    await query(`
      INSERT INTO users (name, email, password, phone, role, is_active)
      VALUES 
        ('Amit Kumar', 'waiter@dumandwok.com', $1, '9876543210', 'waiter', true),
        ('Priya Sharma', 'waiter2@dumandwok.com', $1, '9876543211', 'waiter', true)
      ON CONFLICT (email) DO NOTHING;
    `, [hashedPassword]);

    // Create cook user
    await query(`
      INSERT INTO users (name, email, password, phone, role, is_active)
      VALUES 
        ('Rajesh Chef', 'cook@dumandwok.com', $1, '9876543212', 'cook', true),
        ('Sunil Kitchen', 'cook2@dumandwok.com', $1, '9876543213', 'cook', true)
      ON CONFLICT (email) DO NOTHING;
    `, [hashedPassword]);

    // Create restaurant tables
    await query(`
      INSERT INTO restaurant_tables (table_number, capacity, floor, position_x, position_y)
      VALUES 
        ('T1', 2, 'Ground Floor', 0, 0),
        ('T2', 2, 'Ground Floor', 1, 0),
        ('T3', 4, 'Ground Floor', 2, 0),
        ('T4', 4, 'Ground Floor', 0, 1),
        ('T5', 4, 'Ground Floor', 1, 1),
        ('T6', 6, 'Ground Floor', 2, 1),
        ('T7', 4, 'First Floor', 0, 0),
        ('T8', 4, 'First Floor', 1, 0),
        ('T9', 6, 'First Floor', 2, 0),
        ('T10', 8, 'First Floor', 0, 1)
      ON CONFLICT (table_number) DO NOTHING;
    `);

    console.log('✅ Dine-in seed completed!');
    console.log('');
    console.log('📋 Test Credentials:');
    console.log('   Waiter: waiter@dumandwok.com / staff123');
    console.log('   Cook:   cook@dumandwok.com / staff123');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('❌ Dine-in seed failed:', error);
    process.exit(1);
  }
};

seedDineIn();
