const User = require('../models/User');
const Department = require('../models/Department');
const ClassSession = require('../models/ClassSession');
const { getSocket } = require('../socket');

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getCurrentSession = (sessions) => {
  const now = new Date();
  const currentDay = dayNames[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return sessions.find((session) => {
    if (session.day !== currentDay) return false;
    const start = timeToMinutes(session.startTime);
    const end = timeToMinutes(session.endTime);
    return currentMinutes >= start && currentMinutes <= end;
  });
};

const normalizeStatus = (status) => {
  if (status === 'available') return 'cabin';
  if (status === 'in-class') return 'in_classroom';
  return status || 'logoff';
};

const resolveCurrentLocation = (user, normalizedStatus) => {
  if (normalizedStatus === 'in_classroom') {
    return {
      classroomNumber: user.currentLocationRoomNumber || null,
      classroomFloor: user.currentLocationFloor ?? null,
    };
  }

  if (normalizedStatus === 'cabin') {
    return {
      classroomNumber: user.cabinRoomNumber || user.cabinNumber || null,
      classroomFloor: user.cabinFloor ?? null,
    };
  }

  return {
    classroomNumber: null,
    classroomFloor: null,
  };
};

// @desc    Get all faculty members
// @route   GET /api/users/faculty
// @access  Private
const getFaculty = async (req, res) => {
  try {
    const faculty = await User.find({ role: 'faculty' })
      .select('-password')
      .populate('department', 'name code');

    const facultyIds = faculty.map((user) => user._id);
    const sessions = await ClassSession.find({ faculty: { $in: facultyIds } })
      .populate({
        path: 'classGroup',
        populate: { path: 'department', select: 'name code' },
      });

    const byFaculty = new Map();
    sessions.forEach((session) => {
      const key = session.faculty.toString();
      if (!byFaculty.has(key)) {
        byFaculty.set(key, []);
      }
      byFaculty.get(key).push(session);
    });

    const enriched = faculty.map((user) => {
      const userSessions = byFaculty.get(user._id.toString()) || [];
      const deptMap = new Map();

      if (user.department?._id) {
        deptMap.set(String(user.department._id), {
          _id: user.department._id,
          name: user.department.name,
          code: user.department.code,
        });
      }

      userSessions.forEach((session) => {
        const dept = session.classGroup?.department;
        if (dept?._id) {
          deptMap.set(String(dept._id), {
            _id: dept._id,
            name: dept.name,
            code: dept.code,
          });
        }
      });

      const departments = Array.from(deptMap.values());
      const currentSession = getCurrentSession(userSessions);
      if (currentSession) {
        return {
          ...user.toObject(),
          departments,
          status: 'in_classroom',
          classroomNumber: currentSession.roomNumber,
          classroomFloor: currentSession.floor,
          customStatusMessage: user.customStatusMessage || '',
          activeClassGroup: currentSession.classGroup,
        };
      }

      return {
        ...user.toObject(),
        departments,
        status: normalizeStatus(user.status),
        ...resolveCurrentLocation(user, normalizeStatus(user.status)),
        customStatusMessage: user.customStatusMessage || '',
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update faculty status and cabin
// @route   PUT /api/users/profile
// @access  Private/Faculty
const updateFacultyProfile = async (req, res) => {
  try {
    const updateDoc = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      updateDoc.status = req.body.status;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'cabinNumber')) {
      updateDoc.cabinNumber = req.body.cabinNumber;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'cabinFloor')) {
      updateDoc.cabinFloor = req.body.cabinFloor;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'cabinRoomNumber')) {
      updateDoc.cabinRoomNumber = req.body.cabinRoomNumber;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'departmentId')) {
      updateDoc.department = req.body.departmentId;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'customStatusMessage')) {
      updateDoc.customStatusMessage = String(req.body.customStatusMessage || '').trim().slice(0, 80);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'currentLocationRoomNumber')) {
      updateDoc.currentLocationRoomNumber = String(req.body.currentLocationRoomNumber || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'currentLocationFloor')) {
      updateDoc.currentLocationFloor = req.body.currentLocationFloor;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateDoc },
      { new: true, runValidators: true }
    );

    if (updatedUser) {
      const populated = await User.findById(updatedUser._id).select('-password').populate('department', 'name code');

      const sessions = await ClassSession.find({ faculty: updatedUser._id });
      const currentSession = getCurrentSession(sessions);
      const io = getSocket();
      if (io) {
        const payload = currentSession
          ? [{
              facultyId: updatedUser._id.toString(),
              status: 'in_classroom',
              classroomNumber: currentSession.roomNumber,
              classroomFloor: currentSession.floor,
            }]
          : [{
              facultyId: updatedUser._id.toString(),
              status: normalizeStatus(updatedUser.status),
              ...resolveCurrentLocation(updatedUser, normalizeStatus(updatedUser.status)),
              customStatusMessage: updatedUser.customStatusMessage || '',
            }];
        io.emit('faculty:status', payload);
      }

      return res.json(populated);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all unique departments
// @route   GET /api/users/departments
// @access  Public
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFaculty,
  updateFacultyProfile,
  getDepartments,
};
