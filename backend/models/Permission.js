const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true }, // e.g. "users.manage"
    label: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'general' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Permission', PermissionSchema);
