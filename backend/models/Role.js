const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true },
    permissions: [{ type: String, ref: 'Permission' }],
    isSystem: { type: Boolean, default: false } // prevents deleting built-in roles
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', RoleSchema);
