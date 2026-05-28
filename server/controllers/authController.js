const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const getDeviceFingerprint = (req) =>
  req.body?.deviceFingerprint || req.headers['x-device-fingerprint'];

const isStrongPassword = (password) => {
  const value = String(password || '');
  return value.length >= 6 && /[A-Z]/.test(value) && value.includes('@');
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, departmentId, activeClassGroupId } = req.body;
    const deviceFingerprint = getDeviceFingerprint(req);

    if (!deviceFingerprint && role === 'student') {
      return res.status(400).json({ message: 'Device fingerprint is required' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters, include one uppercase letter, and include @' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Basic validation for faculty
    if (role === 'faculty' && !email.endsWith('@college.edu')) {
        return res.status(400).json({ message: 'Faculty requires an institutional email (@college.edu)' });
    }

    if ((role || 'student') === 'student') {
      const deviceInUse = await User.findOne({ activeDeviceFingerprint: deviceFingerprint });
      if (deviceInUse) {
        return res.status(403).json({ message: 'This device is already linked to another student account. Please logout first.' });
      }
    }

    const user = await User.create({
      name: name || email.split('@')[0],
      email,
      password,
      role: role || 'student',
      department: departmentId || undefined,
      activeClassGroup: activeClassGroupId || undefined,
      activeDeviceFingerprint: (role || 'student') === 'student' ? deviceFingerprint : null,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        activeClassGroup: user.activeClassGroup,
        faceEnrollmentStatus: user.faceEnrollmentStatus || 'not_enrolled',
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const deviceFingerprint = getDeviceFingerprint(req);

    if (!deviceFingerprint && role === 'student') {
      return res.status(400).json({ message: 'Device fingerprint is required' });
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if(role && user.role !== role) {
         return res.status(401).json({ message: `Account is registered as ${user.role}, please login with correct role.` });
      }

      if (user.role === 'student') {
        if (user.activeDeviceFingerprint && user.activeDeviceFingerprint !== deviceFingerprint) {
          return res.status(403).json({ message: 'This student account is already active on another device.' });
        }

        const deviceInUseByOther = await User.findOne({
          role: 'student',
          activeDeviceFingerprint: deviceFingerprint,
          _id: { $ne: user._id },
        });
        if (deviceInUseByOther) {
          return res.status(403).json({ message: 'This device is already linked to another student account.' });
        }

        user.activeDeviceFingerprint = deviceFingerprint;
        await user.save();
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        activeClassGroup: user.activeClassGroup,
        faceEnrollmentStatus: user.faceEnrollmentStatus || 'not_enrolled',
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user and unbind current device
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    const deviceFingerprint = getDeviceFingerprint(req);
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (req.user.role === 'student' && deviceFingerprint && req.user.activeDeviceFingerprint === deviceFingerprint) {
      req.user.activeDeviceFingerprint = null;
      await req.user.save();
    }

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
     res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  logoutUser,
};
