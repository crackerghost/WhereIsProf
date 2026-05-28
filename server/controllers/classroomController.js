const ClassSession = require('../models/ClassSession');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const FaceVerificationGrant = require('../models/FaceVerificationGrant');
const jwt = require('jsonwebtoken');
const { getSocket } = require('../socket');

const verifyFaceGrantToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

// @desc    Get timetable for user
// @route   GET /api/classroom/timetable
// @access  Private
const getTimetable = async (req, res) => {
  try {
    if (req.user.role === 'faculty') {
      const sessions = await ClassSession.find({ faculty: req.user._id })
        .populate('classGroup', 'name semester section')
        .sort({ day: 1, startTime: 1 });
      return res.json(sessions);
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.activeClassGroup) {
      return res.json([]);
    }

    const sessions = await ClassSession.find({ classGroup: user.activeClassGroup })
      .populate('faculty', 'name email')
      .sort({ day: 1, startTime: 1 });

    return res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTodayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const buildQrToken = (attendanceSessionId) =>
  jwt.sign(
    {
      type: 'attendance_qr',
      attendanceSessionId: String(attendanceSessionId),
    },
    process.env.JWT_SECRET,
    { expiresIn: '10s' }
  );

// @desc    Start attendance session for a timetable class (faculty)
// @route   POST /api/classroom/attendance/session/start
// @access  Private/Faculty
const startAttendanceSession = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can start attendance' });
    }

    const { classSessionId } = req.body;
    if (!classSessionId) {
      return res.status(400).json({ message: 'classSessionId is required' });
    }

    const classSession = await ClassSession.findById(classSessionId).populate('classGroup', 'name');
    if (!classSession) {
      return res.status(404).json({ message: 'Class session not found' });
    }

    if (String(classSession.faculty) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed for this class session' });
    }

    const dateKey = getTodayKey();
    const existingSession = await AttendanceSession.findOne({
      classSession: classSession._id,
      dateKey,
    });

    const classGroupId = classSession.classGroup?._id || classSession.classGroup;
    const totalStudents = await User.countDocuments({
      role: 'student',
      activeClassGroup: classGroupId,
    });

    const sessionDoc = await AttendanceSession.findOneAndUpdate(
      { classSession: classSession._id, dateKey },
      {
        $set: {
          classGroup: classGroupId,
          faculty: req.user._id,
          subject: classSession.subject,
          totalStudents: Number(totalStudents),
          active: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('classGroup', 'name');

    // Faculty can overwrite attendance for the same class/date by restarting.
    if (existingSession) {
      await Attendance.deleteMany({ attendanceSession: sessionDoc._id });
    }

    const qrToken = buildQrToken(sessionDoc._id);
    return res.json({
      attendanceSession: sessionDoc,
      qrToken,
      expiresInSeconds: 10,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Refresh rotating attendance QR token (faculty)
// @route   GET /api/classroom/attendance/session/:id/token
// @access  Private/Faculty
const refreshAttendanceToken = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can refresh token' });
    }

    const sessionDoc = await AttendanceSession.findById(req.params.id);
    if (!sessionDoc) {
      return res.status(404).json({ message: 'Attendance session not found' });
    }
    if (String(sessionDoc.faculty) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed for this attendance session' });
    }
    if (!sessionDoc.active) {
      return res.status(400).json({ message: 'Attendance session is not active' });
    }

    const qrToken = buildQrToken(sessionDoc._id);
    return res.json({ qrToken, expiresInSeconds: 10 });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Student scans attendance QR
// @route   POST /api/classroom/attendance/scan
// @access  Private/Student
const scanAttendanceQr = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can scan attendance QR' });
    }

    const qrToken = String(req.body?.qrToken || '').trim();
    const faceVerificationToken = String(req.body?.faceVerificationToken || '').trim();
    if (!qrToken) {
      return res.status(400).json({ message: 'qrToken is required' });
    }
    if (!faceVerificationToken) {
      return res.status(401).json({ message: 'Face verification is required before scanning QR' });
    }

    let decoded;
    try {
      decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'QR expired or invalid. Please rescan.' });
    }

    if (decoded.type !== 'attendance_qr' || !decoded.attendanceSessionId) {
      return res.status(400).json({ message: 'Invalid attendance QR payload' });
    }

    const attendanceSession = await AttendanceSession.findById(decoded.attendanceSessionId);
    if (!attendanceSession || !attendanceSession.active) {
      return res.status(400).json({ message: 'Attendance session is inactive or not found' });
    }

    let decodedFaceGrant;
    try {
      decodedFaceGrant = verifyFaceGrantToken(faceVerificationToken);
    } catch {
      return res.status(401).json({ message: 'Face verification expired. Verify again.' });
    }

    if (decodedFaceGrant?.type !== 'face_verified' || String(decodedFaceGrant?.userId) !== String(req.user._id)) {
      return res.status(401).json({ message: 'Invalid face verification token' });
    }

    const deviceFingerprint = req.headers['x-device-fingerprint'];
    const grant = await FaceVerificationGrant.findOne({
      user: req.user._id,
      jti: decodedFaceGrant.jti,
    });

    if (!grant || grant.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Face verification token is not valid anymore' });
    }
    if (!deviceFingerprint || grant.deviceFingerprint !== deviceFingerprint) {
      return res.status(401).json({ message: 'Device mismatch for face verification token' });
    }

    const student = await User.findById(req.user._id).select('activeClassGroup');
    if (!student || !student.activeClassGroup) {
      return res.status(400).json({ message: 'Set your active class group before scanning' });
    }

    if (String(student.activeClassGroup) !== String(attendanceSession.classGroup)) {
      return res.status(403).json({ message: 'This QR is not for your active class group' });
    }

    const existing = await Attendance.findOne({
      student: req.user._id,
      attendanceSession: attendanceSession._id,
    });

    const attendance = await Attendance.findOneAndUpdate(
      { student: req.user._id, attendanceSession: attendanceSession._id },
      {
        $setOnInsert: {
          classSession: attendanceSession.classSession,
          classGroup: attendanceSession.classGroup,
          faculty: attendanceSession.faculty,
          subject: attendanceSession.subject,
          dateKey: attendanceSession.dateKey,
          status: 'Present',
        },
      },
      { upsert: true, new: true }
    );

    const io = getSocket();
    if (io) {
      io.to(`user:${attendanceSession.faculty.toString()}`).emit('attendance:marked', {
        attendanceSessionId: attendanceSession._id.toString(),
      });
    }

    return res.status(201).json({
      attendance,
      alreadyMarked: Boolean(existing),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get attendance summary for an attendance session (faculty)
// @route   GET /api/classroom/attendance/session/:id/summary
// @access  Private/Faculty
const getAttendanceSessionSummary = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can view session summary' });
    }

    const sessionDoc = await AttendanceSession.findById(req.params.id)
      .populate('classGroup', 'name')
      .populate('classSession', 'subject day startTime endTime roomNumber');

    if (!sessionDoc) {
      return res.status(404).json({ message: 'Attendance session not found' });
    }
    if (String(sessionDoc.faculty) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed for this attendance session' });
    }

    const attendanceList = await Attendance.find({ attendanceSession: sessionDoc._id, status: 'Present' })
      .populate('student', 'name email usn')
      .sort({ createdAt: 1 });

    const presentCount = attendanceList.length;
    const totalStudents = sessionDoc.totalStudents;
    const absentCount = Math.max(totalStudents - presentCount, 0);

    return res.json({
      attendanceSession: sessionDoc,
      totalStudents,
      presentCount,
      absentCount,
      attendees: attendanceList.map((entry) => ({
        id: entry._id,
        name: entry.student?.name || 'Unknown',
        usn: entry.student?.usn || entry.student?.email || 'N/A',
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Stop attendance session for the day (faculty)
// @route   POST /api/classroom/attendance/session/:id/stop
// @access  Private/Faculty
const stopAttendanceSession = async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Only faculty can stop attendance' });
    }

    const sessionDoc = await AttendanceSession.findById(req.params.id);
    if (!sessionDoc) {
      return res.status(404).json({ message: 'Attendance session not found' });
    }
    if (String(sessionDoc.faculty) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed for this attendance session' });
    }

    sessionDoc.active = false;
    await sessionDoc.save();

    return res.json({ message: 'Attendance session stopped', attendanceSession: sessionDoc });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Mark attendance
// @route   POST /api/classroom/attendance
// @access  Private/Student
const markAttendance = async (req, res) => {
  try {
    const { subject, attendanceSessionId, classSessionId, classGroupId } = req.body;

    const attendance = await Attendance.create({
      student: req.user._id,
      subject,
      attendanceSession: attendanceSessionId,
      classSession: classSessionId,
      classGroup: classGroupId,
      faculty: req.body.facultyId,
      dateKey: getTodayKey(),
    });

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get attendance stats
// @route   GET /api/classroom/attendance
// @access  Private
const getAttendance = async (req, res) => {
  try {
    let attendance;
    if (req.user.role === 'faculty') {
        attendance = await Attendance.find({}).populate('student', 'name email');
    } else {
        attendance = await Attendance.find({ student: req.user._id });
    }
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student attendance subject summary
// @route   GET /api/classroom/attendance/summary/student
// @access  Private/Student
const getStudentAttendanceSummary = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can view student summary' });
    }

    const student = await User.findById(req.user._id).select('activeClassGroup');
    if (!student || !student.activeClassGroup) {
      return res.json([]);
    }

    const [sessionCounts, presentCounts] = await Promise.all([
      AttendanceSession.aggregate([
        { $match: { classGroup: student.activeClassGroup } },
        { $group: { _id: '$subject', totalClasses: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: { student: req.user._id, status: 'Present' } },
        { $group: { _id: '$subject', markedClasses: { $sum: 1 } } },
      ]),
    ]);

    const presentMap = new Map(
      presentCounts.map((entry) => [String(entry._id || '').trim(), entry.markedClasses || 0])
    );

    const summary = sessionCounts
      .map((entry) => {
        const subject = String(entry._id || '').trim();
        const totalClasses = Number(entry.totalClasses || 0);
        const markedClasses = Number(presentMap.get(subject) || 0);
        const percentage = totalClasses > 0 ? Number(((markedClasses / totalClasses) * 100).toFixed(1)) : 0;
        return {
          subject,
          totalClasses,
          markedClasses,
          missedClasses: Math.max(totalClasses - markedClasses, 0),
          percentage,
        };
      })
      .filter((entry) => entry.subject)
      .sort((a, b) => a.subject.localeCompare(b.subject, undefined, { sensitivity: 'base' }));

    return res.json(summary);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTimetable,
  markAttendance,
  getAttendance,
  startAttendanceSession,
  refreshAttendanceToken,
  scanAttendanceQr,
  getAttendanceSessionSummary,
  stopAttendanceSession,
  getStudentAttendanceSummary,
};
