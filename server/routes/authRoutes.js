const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, logoutUser } = require('../controllers/authController');
const { protect, student } = require('../middleware/authMiddleware');
const { startFaceVerification, enrollFace, verifyFace } = require('../controllers/faceAuthController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.post('/logout', protect, logoutUser);
router.post('/face/verify/start', protect, student, startFaceVerification);
router.post('/face/enroll', protect, student, enrollFace);
router.post('/face/verify', protect, student, verifyFace);

module.exports = router;
