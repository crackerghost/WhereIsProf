const ClassGroup = require('../models/ClassGroup');
const ClassSession = require('../models/ClassSession');
const User = require('../models/User');

const normalizeDay = (day) => day.trim();

// @desc    Create class group
// @route   POST /api/classes/groups
// @access  Private/Faculty
const createClassGroup = async (req, res) => {
  try {
    const { departmentId, name, floor } = req.body;

    if (!departmentId || !name || floor === undefined || floor === null || Number.isNaN(Number(floor))) {
      return res.status(400).json({ message: 'departmentId, name and floor are required' });
    }

    const classGroup = await ClassGroup.create({
      department: departmentId,
      name,
      floor: Number(floor),
      semester: '',
      section: '',
    });

    res.status(201).json(classGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get class groups
// @route   GET /api/classes/groups
// @access  Private
const getClassGroups = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const query = departmentId ? { department: departmentId } : {};

    const groups = await ClassGroup.find(query)
      .populate('department', 'name code')
      .sort({ name: 1, semester: 1, section: 1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create class session
// @route   POST /api/classes/sessions
// @access  Private/Faculty
const createClassSession = async (req, res) => {
  try {
    const { classGroupId, subject, day, startTime, endTime, floor, roomNumber } = req.body;

    if (!classGroupId || !subject || !day || !startTime || !endTime || !roomNumber) {
      return res.status(400).json({ message: 'Missing required class session fields' });
    }

    const classGroup = await ClassGroup.findById(classGroupId).select('floor');
    if (!classGroup) {
      return res.status(404).json({ message: 'Class group not found' });
    }

    const mappedFloor = floor !== undefined && floor !== null && !Number.isNaN(Number(floor))
      ? Number(floor)
      : classGroup.floor;

    if (mappedFloor === undefined || mappedFloor === null || Number.isNaN(Number(mappedFloor))) {
      return res.status(400).json({ message: 'Selected class group does not have a floor mapped' });
    }

    const session = await ClassSession.create({
      classGroup: classGroupId,
      faculty: req.user._id,
      subject,
      day: normalizeDay(day),
      startTime,
      endTime,
      floor: Number(mappedFloor),
      roomNumber,
    });

    const populated = await ClassSession.findById(session._id)
      .populate('classGroup', 'name semester section')
      .populate('faculty', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get class sessions
// @route   GET /api/classes/sessions
// @access  Private
const getClassSessions = async (req, res) => {
  try {
    const { classGroupId, facultyId } = req.query;
    const query = {};
    if (classGroupId) query.classGroup = classGroupId;
    if (facultyId) query.faculty = facultyId;

    const sessions = await ClassSession.find(query)
      .populate('classGroup', 'name semester section')
      .populate('faculty', 'name email');

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set active class group for student
// @route   PATCH /api/classes/active
// @access  Private/Student
const setActiveClassGroup = async (req, res) => {
  try {
    const { classGroupId } = req.body;

    if (!classGroupId) {
      return res.status(400).json({ message: 'classGroupId is required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { activeClassGroup: classGroupId } },
      { new: true, runValidators: true }
    )
      .populate('department', 'name code')
      .populate('activeClassGroup', 'name semester section')
      .select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createClassGroup,
  getClassGroups,
  createClassSession,
  getClassSessions,
  setActiveClassGroup,
};
