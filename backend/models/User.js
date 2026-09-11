const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, ref: 'Role', required: true, default: 'user' },
    blocked: { type: Boolean, default: false },
    blockedReason: { type: String, default: '' },
    createdBy: { type: String, default: 'system' },
    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

UserSchema.methods.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

UserSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

UserSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    username: this.username,
    role: this.role,
    blocked: this.blocked,
    blockedReason: this.blockedReason,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', UserSchema);
