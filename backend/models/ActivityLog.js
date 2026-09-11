const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    icon: { type: String, default: 'ℹ️' },
    message: { type: String, required: true },
    action: { type: String, required: true }, // e.g. LOGIN_SUCCESS, USER_BLOCKED
    username: { type: String, default: '(not logged in)' },
    role: { type: String, default: '-' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' }
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
