const express = require('express');
const Member = require('../models/Member');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/members/search?cnic=XXXXX-XXXXXXX-X
router.get('/search', async (req, res) => {
  const raw = (req.query.cnic || '').toString();
  const cnicDigits = raw.replace(/\D/g, '');

  if (cnicDigits.length !== 13) {
    return res.status(400).json({ success: false, message: 'Please provide a valid 13-digit CNIC' });
  }

  const start = Date.now();
  const results = await Member.find({ cnicDigits });
  const timeMs = Date.now() - start;

  await ActivityLog.create({
    icon: results.length ? '✅' : '🔍',
    message: `<strong>${req.user.username}</strong> searched CNIC: ${raw} — ${results.length} result(s) found`,
    action: 'MEMBER_SEARCH',
    username: req.user.username,
    role: req.user.role,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || ''
  });

  res.json({
    success: true,
    timeMs,
    count: results.length,
    results: results.map(r => ({
      cnic: r.cnic,
      applicantName: r.applicantName,
      businessSubSector: r.businessSubSector,
      mfiBankName: r.mfiBankName
    }))
  });
});

// POST /api/members/bulk - admin/import helper to load records into MongoDB
router.post('/bulk', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ success: false, message: 'No rows provided' });

  const docs = rows.map(r => ({
    cnic: r[0] || '',
    applicantName: r[1] || '',
    businessSubSector: r[2] || '',
    mfiBankName: r[3] || ''
  }));
  const inserted = await Member.insertMany(docs, { ordered: false });
  res.json({ success: true, inserted: inserted.length });
});

module.exports = router;
