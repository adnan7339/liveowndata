const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function log(icon, message, action, req, username = '(not logged in)', role = '-') {
  await ActivityLog.create({
    icon,
    message,
    action,
    username,
    role,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || ''
  });
}

// POST /api/auth/login
router.post(
  '/login',
  [body('username').trim().notEmpty(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const username = req.body.username.trim().toLowerCase();
    const { password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      await log('❌', `Failed login attempt: unknown user <strong>${username}</strong>`, 'LOGIN_FAILED', req);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (user.blocked) {
      await log('🔒', `Blocked user tried to login: <strong>${username}</strong>`, 'LOGIN_BLOCKED', req, username, user.role);
      return res.status(403).json({ success: false, message: 'This account has been blocked. Contact an administrator.' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      user.failedLoginAttempts += 1;
      await user.save();
      await log('⚠️', `Wrong password for <strong>${username}</strong>`, 'LOGIN_WRONG_PASSWORD', req, username, user.role);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    await log('✅', `<strong>${username}</strong> logged in successfully`, 'LOGIN_SUCCESS', req, username, user.role);

    res.json({
      success: true,
      token,
      user: user.toSafeJSON()
    });
  }
);

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});

// POST /api/auth/logout  (stateless JWT — client just discards the token;
// this endpoint exists so the action is still recorded in the activity log)
router.post('/logout', authenticate, async (req, res) => {
  await log('🚪', `<strong>${req.user.username}</strong> logged out`, 'LOGOUT', req, req.user.username, req.user.role);
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
