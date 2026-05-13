const Broadcast = require('../models/Broadcast');
const ClassGroup = require('../models/ClassGroup');
const { getSocket } = require('../socket');

// @desc    Create a new broadcast
// @route   POST /api/broadcasts
// @access  Private/Faculty
const createBroadcast = async (req, res) => {
  try {
    const { classGroupId, subject, type, content, fileName, fileSize } = req.body;

    if (!classGroupId) {
      return res.status(400).json({ message: 'classGroupId is required' });
    }

    const classGroup = await ClassGroup.findById(classGroupId);
    if (!classGroup) {
      return res.status(404).json({ message: 'Class group not found' });
    }

    const broadcast = await Broadcast.create({
      faculty: req.user._id,
      classGroup: classGroupId,
      subject,
      type,
      content,
      fileName,
      fileSize,
    });

    const populated = await Broadcast.findById(broadcast._id)
      .populate('faculty', 'name department')
      .populate('classGroup', 'name semester section');

    const io = getSocket();
    if (io) {
      io.to(`class:${classGroupId}`).emit('broadcast:new', populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all broadcasts
// @route   GET /api/broadcasts
// @access  Private
const getBroadcasts = async (req, res) => {
  try {
    const { classGroupId } = req.query;
    const query = classGroupId ? { classGroup: classGroupId } : {};

    const broadcasts = await Broadcast.find(query)
      .populate('faculty', 'name department')
      .populate('classGroup', 'name semester section')
      .sort({ createdAt: -1 });
    res.json(broadcasts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBroadcast,
  getBroadcasts,
};
