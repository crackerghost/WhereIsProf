const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      if (req.user?.role === 'student') {
        const deviceFingerprint = req.headers['x-device-fingerprint'];
        if (!deviceFingerprint) {
          return res.status(401).json({ message: 'Device fingerprint missing' });
        }
        if (req.user?.activeDeviceFingerprint && req.user.activeDeviceFingerprint !== deviceFingerprint) {
          return res.status(401).json({ message: 'Device authorization mismatch. Please login again.' });
        }
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const faculty = (req, res, next) => {
  if (req.user && req.user.role === 'faculty') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as faculty' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as admin' });
  }
};

const student = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as student' });
  }
};

module.exports = { protect, faculty, admin, student };
