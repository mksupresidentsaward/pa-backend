/**
 * Initialize Super Admin from environment variables
 * Run this script at server startup or manually: node scripts/initSuperAdmin.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('../config/db');
const User = require('../models/user');

async function initSuperAdmin() {
  try {
    await connectDB();

    const superAdminName = process.env.SUPERADMIN_NAME;
    const superAdminEmail = process.env.SUPERADMIN_EMAIL;
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD;

    if (!superAdminEmail || !superAdminPassword) {
      console.log('⚠️  SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD not set in .env. Skipping super admin creation.');
      return;
    }

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ superAdmin: true });
    if (existingSuperAdmin) {
      console.log('✅ Super admin already exists:', existingSuperAdmin.email);
      return;
    }

    // Check if user with this email exists
    const existingUser = await User.findOne({ email: superAdminEmail.toLowerCase() });
    if (existingUser) {
      console.log('⚠️  User with email already exists. Updating to super admin...');
      existingUser.superAdmin = true;
      await existingUser.save();
      console.log('✅ User updated to super admin:', existingUser.email);
      return;
    }

    // Create new super admin
    const superAdmin = new User({
      name: superAdminName || 'Super Admin',
      email: superAdminEmail.toLowerCase(),
      password: superAdminPassword,
      role: 'admin',
      superAdmin: true,
    });

    await superAdmin.save();
    console.log('✅ Super admin created successfully:', superAdmin.email);
  } catch (error) {
    console.error('❌ Error initializing super admin:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initSuperAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = initSuperAdmin;

