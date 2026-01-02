// MongoDB seed script for initial data
// Run: node scripts/seed-database.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecowaste';

const users = [
  {
    name: 'Test Collector',
    email: 'collector@test.com',
    password: 'test123',
    role: 'collector',
    currentStreak: 0,
    longestStreak: 0,
    withdrawnPoints: 0,
    createdAt: new Date(),
    lastActiveAt: new Date()
  },
  {
    name: 'Government Employee',
    email: 'employee@gov.com',
    password: 'test123',
    role: 'employee',
    createdAt: new Date(),
    lastActiveAt: new Date()
  }
];

const dustbins = [
  {
    name: 'Main Street Bin',
    description: 'Primary collection point',
    sector: 'Zone A',
    type: 'mixed',
    capacityLiters: 240,
    status: 'active',
    fillLevel: 30,
    coordinates: { lat: 12.9721, lng: 77.5950 },
    photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    verificationRadius: 50.0,
    urgent: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Park Bin',
    description: 'Park entrance bin',
    sector: 'Zone B',
    type: 'organic',
    capacityLiters: 120,
    status: 'active',
    fillLevel: 60,
    coordinates: { lat: 12.9716, lng: 77.5946 },
    photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    verificationRadius: 50.0,
    urgent: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Market Bin',
    description: 'Market area collection',
    sector: 'Zone A',
    type: 'plastic',
    capacityLiters: 240,
    status: 'active',
    fillLevel: 45,
    coordinates: { lat: 12.9726, lng: 77.5955 },
    photoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    verificationRadius: 50.0,
    urgent: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');
    console.log(`Connecting to: ${MONGO_URI}`);
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Hash passwords
    console.log('🔐 Hashing passwords...');
    for (const user of users) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(user.password, salt);
      user.passwordHash = hash;
      delete user.password;
    }
    console.log('✅ Passwords hashed\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing users and dustbins...');
    await db.collection('users').deleteMany({});
    await db.collection('dustbins').deleteMany({});
    console.log('✅ Collections cleared\n');

    // Insert users
    console.log('👥 Inserting users...');
    const insertedUsers = await db.collection('users').insertMany(users);
    console.log(`✅ Inserted ${insertedUsers.insertedCount} users`);
    users.forEach((user, i) => {
      const plainPassword = user.email === 'collector@test.com' ? 'test123' : 'test123';
      console.log(`   - ${user.name} (${user.email}) - password: test123`);
    });
    console.log('');

    // Insert dustbins
    console.log('🗑️  Inserting dustbins...');
    const insertedDustbins = await db.collection('dustbins').insertMany(dustbins);
    console.log(`✅ Inserted ${insertedDustbins.insertedCount} dustbins`);
    dustbins.forEach(bin => {
      console.log(`   - ${bin.name} at (${bin.coordinates.lat}, ${bin.coordinates.lng})`);
    });
    console.log('');

    console.log('✅ Database seeded successfully!\n');
    console.log('📝 Login credentials:');
    console.log('   Collector: collector@test.com / test123');
    console.log('   Employee:  employee@gov.com / test123\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
