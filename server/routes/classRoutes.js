const express = require('express');
const router = express.Router();
const {
  createClassGroup,
  getClassGroups,
  createClassSession,
  getClassSessions,
  setActiveClassGroup,
} = require('../controllers/classController');
const { protect, faculty, student } = require('../middleware/authMiddleware');

router.route('/groups')
  .get(protect, getClassGroups)
  .post(protect, faculty, createClassGroup);

router.route('/sessions')
  .get(protect, getClassSessions)
  .post(protect, faculty, createClassSession);

router.patch('/active', protect, student, setActiveClassGroup);

module.exports = router;
