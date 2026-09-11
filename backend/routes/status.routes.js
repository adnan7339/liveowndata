const express = require('express');
const mongoose = require('mongoose');
const { getDbStatus } = require('../config/db');
const User = require('../models/User');
const Member = require('../models/Member');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();

// GET /api/status/database - admin-only detailed status
router.get('/database', authenticate, authorizeRoles('admin'), async (req, res) => {
  const dbStatus = getDbStatus();

  let counts = { users: 0, members: 0, activityLogs: 0 };
  let collections = [];
  try {
    if (dbStatus.connected) {
      counts.users = await User.countDocuments();
      counts.members = await Member.countDocuments();
      counts.activityLogs = await ActivityLog.countDocuments();
      const raw = await mongoose.connection.db.listCollections().toArray();
      collections = raw.map(c => c.name);
    }
  } catch (e) {
    // leave counts at 0 if something goes wrong mid-request
  }

  res.json({
    success: true,
    database: dbStatus,
    counts,
    collections,
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime())
  });
});

// GET /api/status/health - public lightweight health check
router.get('/health', (req, res) => {
  const dbStatus = getDbStatus();
  res.json({ success: true, status: 'ok', dbConnected: dbStatus.connected });
});

module.exports = router;
