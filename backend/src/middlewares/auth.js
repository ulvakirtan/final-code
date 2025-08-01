const jwt = require('jsonwebtoken');

function auth(requiredRoles = null) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ msg: 'Missing token' });

    const token = authHeader.split(' ')[1]; // Format: 'Bearer <token>'
    if (!token) return res.status(401).json({ msg: 'Missing token' });
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campussecret');
      req.user = decoded;
      
      // Check role permissions if required
      if (requiredRoles) {
        const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        
        if (!allowedRoles.includes(decoded.role)) {
          return res.status(403).json({ 
            msg: 'Forbidden, insufficient permissions',
            requiredRoles: allowedRoles,
            userRole: decoded.role
          });
        }
      }
      
      next();
    } catch (err) {
      return res.status(401).json({ msg: 'Invalid token' });
    }
  }
}

module.exports = auth;

