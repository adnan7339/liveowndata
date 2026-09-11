const Role = require('../models/Role');

// Restrict a route to one or more roles, e.g. authorizeRoles('admin')
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

// Restrict a route to users whose role carries a specific permission key,
// e.g. authorizePermission('users.manage')
function authorizePermission(permissionKey) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    try {
      const role = await Role.findOne({ name: req.user.role });
      if (!role || !role.permissions.includes(permissionKey)) {
        return res.status(403).json({ success: false, message: `Missing permission: ${permissionKey}` });
      }
      next();
    } catch (err) {
      res.status(500).json({ success: false, message: 'Authorization check failed' });
    }
  };
}

module.exports = { authorizeRoles, authorizePermission };
