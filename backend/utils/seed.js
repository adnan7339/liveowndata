require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const User = require('../models/User');

const PERMISSIONS = [
  { key: 'users.manage', label: 'Manage Users', category: 'Admin Panel' },
  { key: 'users.reset_password', label: 'Reset User Passwords', category: 'Admin Panel' },
  { key: 'users.block', label: 'Block / Unblock Users', category: 'Admin Panel' },
  { key: 'roles.manage', label: 'Manage Roles', category: 'Admin Panel' },
  { key: 'permissions.manage', label: 'Manage Permissions', category: 'Admin Panel' },
  { key: 'activity.view', label: 'View Activity Logs', category: 'Admin Panel' },
  { key: 'activity.clear', label: 'Clear Activity Logs', category: 'Admin Panel' },
  { key: 'database.view_status', label: 'View Database Status', category: 'Admin Panel' },
  { key: 'members.search', label: 'Search Member Records', category: 'Member Search' },
  { key: 'members.import', label: 'Import Member Records', category: 'Member Search' }
];

const ROLES = [
  { name: 'admin', label: 'Administrator', isSystem: true, permissions: PERMISSIONS.map(p => p.key) },
  { name: 'user', label: 'Standard User', isSystem: true, permissions: ['members.search'] },
  { name: 'demo', label: 'Demo Access', isSystem: true, permissions: ['members.search'] }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected for seeding:', mongoose.connection.name);

  for (const perm of PERMISSIONS) {
    await Permission.updateOne({ key: perm.key }, { $set: perm }, { upsert: true });
  }
  console.log(`✅ ${PERMISSIONS.length} permissions ensured`);

  for (const role of ROLES) {
    await Role.updateOne({ name: role.name }, { $set: role }, { upsert: true });
  }
  console.log(`✅ ${ROLES.length} roles ensured`);

  const adminUsername = (process.env.DEFAULT_ADMIN_USERNAME || 'admin').toLowerCase();
  let admin = await User.findOne({ username: adminUsername });
  if (!admin) {
    admin = new User({ username: adminUsername, role: 'admin', createdBy: 'seed' });
    await admin.setPassword(process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!');
    await admin.save();
    console.log(`✅ Default admin created: ${adminUsername} / (see .env DEFAULT_ADMIN_PASSWORD)`);
  } else {
    console.log(`ℹ️  Admin user "${adminUsername}" already exists — left untouched`);
  }

  await mongoose.disconnect();
  console.log('🌱 Seeding complete');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
