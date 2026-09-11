const express = require('express');
const { body, validationResult } = require('express-validator');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();
router.use(authenticate, authorizeRoles('admin'));

async function log(icon, message, action, req) {
  await ActivityLog.create({
    icon, message, action,
    username: req.user.username, role: req.user.role,
    ip: req.ip, userAgent: req.headers['user-agent'] || ''
  });
}

// GET /api/roles
router.get('/', async (req, res) => {
  const roles = await Role.find().sort({ name: 1 });
  res.json({ success: true, roles });
});

// POST /api/roles - create a new role
router.post(
  '/',
  [body('name').trim().isLength({ min: 2 }), body('label').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Role name and label are required' });
    }
    const name = req.body.name.trim().toLowerCase();
    if (await Role.findOne({ name })) {
      return res.status(409).json({ success: false, message: 'Role already exists' });
    }
    const role = await Role.create({
      name,
      label: req.body.label,
      permissions: Array.isArray(req.body.permissions) ? req.body.permissions : []
    });
    await log('🛡️', `Admin <strong>${req.user.username}</strong> created role <strong>${name}</strong>`, 'ROLE_CREATED', req);
    res.status(201).json({ success: true, role });
  }
);

// PUT /api/roles/:name/permissions - update which permissions a role has
router.put('/:name/permissions', [body('permissions').isArray()], async (req, res) => {
  const role = await Role.findOne({ name: req.params.name });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

  const validKeys = new Set((await Permission.find({ key: { $in: req.body.permissions } })).map(p => p.key));
  role.permissions = req.body.permissions.filter(k => validKeys.has(k));
  await role.save();
  await log('🛡️', `Admin <strong>${req.user.username}</strong> updated permissions for role <strong>${role.name}</strong>`, 'ROLE_PERMISSIONS_UPDATED', req);
  res.json({ success: true, role });
});

// DELETE /api/roles/:name
router.delete('/:name', async (req, res) => {
  const role = await Role.findOne({ name: req.params.name });
  if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
  if (role.isSystem) return res.status(400).json({ success: false, message: 'Cannot delete a built-in system role' });

  const inUse = await User.countDocuments({ role: role.name });
  if (inUse > 0) {
    return res.status(400).json({ success: false, message: `${inUse} user(s) still have this role assigned` });
  }
  await role.deleteOne();
  await log('🗑️', `Admin <strong>${req.user.username}</strong> deleted role <strong>${role.name}</strong>`, 'ROLE_DELETED', req);
  res.json({ success: true, message: 'Role deleted' });
});

module.exports = router;
