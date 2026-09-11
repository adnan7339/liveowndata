const express = require('express');
const Permission = require('../models/Permission');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

const router = express.Router();
router.use(authenticate, authorizeRoles('admin'));

// GET /api/permissions - list every permission key the system knows about
router.get('/', async (req, res) => {
  const permissions = await Permission.find().sort({ category: 1, key: 1 });
  res.json({ success: true, permissions });
});

module.exports = router;
