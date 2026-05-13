const express = require('express');
const router = express.Router();
const {
  getTimetable,
  markAttendance,
  getAttendance,
  startAttendanceSession,
  refreshAttendanceToken,
  scanAttendanceQr,
  getAttendanceSessionSummary,
} = require('../controllers/classroomController');
const { protect } = require('../middleware/authMiddleware');

router.get('/timetable', protect, getTimetable);
router.route('/attendance')
  .post(protect, markAttendance)
  .get(protect, getAttendance);
router.post('/attendance/scan', protect, scanAttendanceQr);
router.post('/attendance/session/start', protect, startAttendanceSession);
router.get('/attendance/session/:id/token', protect, refreshAttendanceToken);
router.get('/attendance/session/:id/summary', protect, getAttendanceSessionSummary);

module.exports = router;
