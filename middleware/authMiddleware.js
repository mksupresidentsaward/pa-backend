const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      // Check if user is an admin
      if (req.user && req.user.role === 'admin') {
        // Check for inactivity timeout (60 minutes = 1 hour)
        const now = new Date();
        const lastActive = req.user.lastActiveAt || new Date(0);
        const minutesSinceLastActive = (now - lastActive) / (1000 * 60);
        
        // Enforce 60-minute inactivity timeout
        if (minutesSinceLastActive >= 60) {
          return res.status(401).json({ 
            message: 'Session expired due to inactivity. Please log in again.',
            expired: true,
          });
        }
        
        // Update lastActiveAt on authenticated requests (sliding session)
        // Only update if more than 1 minute has passed to avoid excessive DB writes
        if (minutesSinceLastActive >= 1) {
          req.user.lastActiveAt = now;
          await req.user.save({ validateBeforeSave: false });
        }
        
        next();
      } else {
        res.status(403).json({ message: 'Not authorized, admin role required' });
      }
    } catch (error) {
      console.error(error);
      // Check if token is expired specifically
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Your session has expired. Please log in again.',
          expired: true,
        });
      }
      // Check if token is invalid
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token. Please log in again.',
          expired: true,
        });
      }
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protectAdmin };
