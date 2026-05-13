const express = require('express');
const router = express.Router();
const { getFaculty, updateFacultyProfile, getDepartments } = require('../controllers/userController');
const { protect, faculty } = require('../middleware/authMiddleware');

router.get('/faculty', protect, getFaculty);
router.get('/departments', getDepartments);
router.put('/profile', protect, faculty, updateFacultyProfile);

module.exports = router;
