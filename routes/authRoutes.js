const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { protectAdmin } = require('../middleware/authMiddleware');

// Generate JWT with 1 hour expiration for auto-logout after inactivity
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1h', // Token expires after 1 hour
  });
};

// @route   POST /api/auth/register
// @desc    Register a new admin (Protected, or use for seeding)
// @access  Admin (or run once manually for setup)
const ADMIN_REGISTRATION_LIMIT = parseInt(process.env.ADMIN_REGISTRATION_LIMIT || '3', 10);

router.post(
  '/register',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      const [existingUser, adminCount, superAdminExists] = await Promise.all([
        User.findOne({ email }),
        User.countDocuments({ role: 'admin' }),
        User.exists({ role: 'admin', superAdmin: true }),
      ]);

      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      if (adminCount >= ADMIN_REGISTRATION_LIMIT) {
        return res.status(403).json({
          message: 'Admin registration limit reached',
          registrationOpen: false,
          remainingSlots: 0,
        });
      }

      let requester = null;
      if (superAdminExists) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res
            .status(403)
            .json({ message: 'Super admin authorization required to register admins' });
        }
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
          requester = await User.findById(decoded.id);
        } catch (error) {
          console.error('Invalid token for admin registration', error);
          return res.status(401).json({ message: 'Invalid token provided' });
        }

        if (!requester || !requester.superAdmin) {
          return res
            .status(403)
            .json({ message: 'Only super admins can register new admins' });
        }
      }

      const isFirstAdmin = !superAdminExists && adminCount === 0;

      const user = new User({
        name,
        email,
        password,
        role: 'admin',
        superAdmin: isFirstAdmin,
      });

      await user.save();

      const remainingSlots = Math.max(0, ADMIN_REGISTRATION_LIMIT - (adminCount + 1));
      const responseBody = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        superAdmin: user.superAdmin,
        registrationOpen: remainingSlots > 0,
        remainingSlots,
      };

      // Maintain existing behavior of returning a token for compatibility
      responseBody.token = generateToken(user._id);

      res.status(201).json(responseBody);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate admin & get token
// @access  Public
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });

      if (user && (await user.matchPassword(password))) {
        // Update lastActiveAt on login
        user.lastActiveAt = new Date();
        await user.save({ validateBeforeSave: false });

        res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          superAdmin: user.superAdmin,
          avatar: user.avatar,
          token: generateToken(user._id),
        });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
  }
);

router.get('/admin-status', async (req, res) => {
  try {
    const [adminCount, superAdminExists] = await Promise.all([
      User.countDocuments({ role: 'admin' }),
      User.exists({ role: 'admin', superAdmin: true }),
    ]);

    const remainingSlots = Math.max(0, ADMIN_REGISTRATION_LIMIT - adminCount);

    res.json({
      adminCount,
      superAdminExists: Boolean(superAdminExists),
      registrationLimit: ADMIN_REGISTRATION_LIMIT,
      registrationOpen: adminCount < ADMIN_REGISTRATION_LIMIT,
      remainingSlots,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', protectAdmin, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    superAdmin: req.user.superAdmin,
    avatar: req.user.avatar,
    lastActiveAt: req.user.lastActiveAt,
  });
});

// @route   POST /api/auth/ping
// @desc    Ping endpoint for session keepalive and inactivity check
// @access  Admin (protected)
router.post('/ping', protectAdmin, async (req, res) => {
  try {
    // Update lastActiveAt (already done in protectAdmin middleware, but ensure it's fresh)
    const user = await User.findById(req.user._id);
    if (user) {
      user.lastActiveAt = new Date();
      await user.save({ validateBeforeSave: false });
    }

    // Check inactivity timeout (60 minutes)
    const now = new Date();
    const lastActive = req.user.lastActiveAt || new Date(0);
    const minutesSinceLastActive = (now - lastActive) / (1000 * 60);

    if (minutesSinceLastActive >= 60) {
      return res.status(401).json({
        message: 'Session expired due to inactivity',
        expired: true,
      });
    }

    // Return token expiry info
    const token = req.headers.authorization?.split(' ')[1];
    let expiresAt = null;
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          expiresAt = new Date(decoded.exp * 1000);
        }
      } catch (e) {
        // Ignore decode errors
      }
    }

    res.json({
      active: true,
      lastActiveAt: user.lastActiveAt,
      expiresAt,
      minutesRemaining: expiresAt ? Math.max(0, (expiresAt - now) / (1000 * 60)) : null,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/admins
// @desc    Get all admins
// @access  Admin (Protected)
router.get('/admins', protectAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/auth/admins/:id
// @desc    Delete an admin
// @access  Super Admin (Protected)
router.delete('/admins/:id', protectAdmin, async (req, res) => {
  try {
    // Check if requester is super admin
    if (!req.user.superAdmin) {
      return res.status(403).json({ message: 'Only super admins can delete admins' });
    }

    const admin = await User.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (admin.superAdmin) {
      return res.status(400).json({ message: 'Cannot delete super admin' });
    }

    await admin.deleteOne();
    res.json({ message: 'Admin removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
