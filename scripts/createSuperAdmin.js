const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../backend/config/db');
const User = require('../backend/models/User');

async function main() {
  const [nameArg, emailArg, passwordArg] = process.argv.slice(2);

  if (!emailArg || !passwordArg) {
    console.log('Usage: node scripts/createSuperAdmin.js "<name>" <email> <password>');
    process.exit(1);
  }

  const name = nameArg || 'Super Admin';
  const email = emailArg.toLowerCase();
  const password = passwordArg;

  await connectDB();

  const existingAdmin = await User.exists({ role: 'admin' });
  if (existingAdmin) {
    console.log('An admin account already exists. This script is intended for initial seeding only.');
    process.exit(0);
  }

  const user = new User({
    name,
    email,
    password,
    role: 'admin',
    superAdmin: true,
  });

  await user.save();

  console.log(`✅ Super admin created successfully for ${email}.`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to create super admin:', error);
  process.exit(1);
});

