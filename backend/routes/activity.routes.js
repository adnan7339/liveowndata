const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();
router.use(authenticate, authorizeRoles('admin'));

// GET /api/activity?limit=200
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit);
  res.json({ success: true, logs });
});

// DELETE /api/activity - clear the log
router.delete('/', async (req, res) => {
  await ActivityLog.deleteMany({});
  await ActivityLog.create({
    icon: '🗑️',
    message: `Admin <strong>${req.user.username}</strong> cleared the activity log`,
    action: 'ACTIVITY_LOG_CLEARED',
    username: req.user.username,
    role: req.user.role,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || ''
  });
  res.json({ success: true, message: 'Activity log cleared' });
});

module.exports = router;
