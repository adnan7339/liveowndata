const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Role = require('../models/Role');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();
router.use(authenticate, authorizeRoles('admin'));

async function log(icon, message, action, req) {
  await ActivityLog.create({
    icon, message, action,
    username: req.user.username,
    role: req.user.role,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || ''
  });
}

// GET /api/users - list all users
router.get('/', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, users: users.map(u => u.toSafeJSON()) });
});

// POST /api/users - add new user
router.post(
  '/',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').trim().notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const username = req.body.username.trim().toLowerCase();
    const { password, role } = req.body;

    const roleExists = await Role.findOne({ name: role });
    if (!roleExists) {
      return res.status(400).json({ success: false, message: `Role "${role}" does not exist` });
    }
    if (await User.findOne({ username })) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const user = new User({ username, role, createdBy: req.user.username });
    await user.setPassword(password);
    await user.save();

    await log('➕', `Admin <strong>${req.user.username}</strong> added new user <strong>${username}</strong> (${role})`, 'USER_CREATED', req);
    res.status(201).json({ success: true, user: user.toSafeJSON() });
  }
);

// PUT /api/users/:id/role - change a user's role
router.put('/:id/role', [body('role').trim().notEmpty()], async (req, res) => {
  const roleExists = await Role.findOne({ name: req.body.role });
  if (!roleExists) return res.status(400).json({ success: false, message: 'Role does not exist' });

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const oldRole = user.role;
  user.role = req.body.role;
  await user.save();
  await log('🛡️', `Admin <strong>${req.user.username}</strong> changed <strong>${user.username}</strong> role: ${oldRole} → ${user.role}`, 'USER_ROLE_CHANGED', req);
  res.json({ success: true, user: user.toSafeJSON() });
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', [body('newPassword').isLength({ min: 6 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  await user.setPassword(req.body.newPassword);
  await user.save();
  await log('🔑', `Admin <strong>${req.user.username}</strong> reset password for <strong>${user.username}</strong>`, 'PASSWORD_RESET', req);
  res.json({ success: true, message: `Password for "${user.username}" has been updated` });
});

// POST /api/users/:id/block
router.post('/:id/block', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.username === req.user.username) {
    return res.status(400).json({ success: false, message: 'You cannot block your own account' });
  }
  user.blocked = true;
  user.blockedReason = req.body.reason || '';
  await user.save();
  await log('🔒', `Admin <strong>${req.user.username}</strong> blocked user <strong>${user.username}</strong>`, 'USER_BLOCKED', req);
  res.json({ success: true, user: user.toSafeJSON() });
});

// POST /api/users/:id/unblock
router.post('/:id/unblock', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.blocked = false;
  user.blockedReason = '';
  await user.save();
  await log('🔓', `Admin <strong>${req.user.username}</strong> unblocked user <strong>${user.username}</strong>`, 'USER_UNBLOCKED', req);
  res.json({ success: true, user: user.toSafeJSON() });
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.username === req.user.username) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
  }
  await user.deleteOne();
  await log('🗑️', `Admin <strong>${req.user.username}</strong> deleted user <strong>${user.username}</strong>`, 'USER_DELETED', req);
  res.json({ success: true, message: `User "${user.username}" deleted` });
});

module.exports = router;
