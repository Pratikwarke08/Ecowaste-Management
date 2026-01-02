// Helper script to generate bcrypt password hashes for seeding users
// Run: node scripts/hash-password.js <password>

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/hash-password.js <password>');
  console.error('Example: node scripts/hash-password.js test123');
  process.exit(1);
}

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('\n🔐 Password Hash Generated:');
console.log('─'.repeat(60));
console.log(`Password: ${password}`);
console.log(`Hash:     ${hash}`);
console.log('─'.repeat(60));
console.log('\nUse this hash in your MongoDB seed script.\n');
