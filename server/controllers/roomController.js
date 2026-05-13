const Room = require('../models/Room');
const ClassSession = require('../models/ClassSession');

// @desc    Create room
// @route   POST /api/rooms
// @access  Private/Admin
const createRoom = async (req, res) => {
  try {
    const { floor, roomNumber, label } = req.body;

    if (floor === undefined || !roomNumber) {
      return res.status(400).json({ message: 'floor and roomNumber are required' });
    }

    const existing = await Room.findOne({ floor, roomNumber });
    if (existing) {
      return res.status(400).json({ message: 'Room already exists' });
    }

    const room = await Room.create({ floor, roomNumber, label });
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get rooms (optional floor)
// @route   GET /api/rooms
// @access  Public
const getRooms = async (req, res) => {
  try {
    const { floor } = req.query;
    const query = floor ? { floor: Number(floor) } : {};
    const [rooms, sessionRooms] = await Promise.all([
      Room.find(query),
      ClassSession.find(query).select('floor roomNumber -_id'),
    ]);

    const merged = new Map();
    rooms.forEach((room) => {
      const roomNumber = room.roomNumber ? String(room.roomNumber).trim() : '';
      if (!roomNumber || roomNumber.toLowerCase() === 'undefined') return;
      const key = `${room.floor}::${roomNumber}`;
      merged.set(key, {
        ...room.toObject(),
        roomNumber,
      });
    });

    sessionRooms.forEach((room) => {
      const roomNumber = room.roomNumber ? String(room.roomNumber).trim() : '';
      if (!roomNumber || roomNumber.toLowerCase() === 'undefined') return;
      const key = `${room.floor}::${roomNumber}`;
      if (!merged.has(key)) {
        merged.set(key, {
          floor: room.floor,
          roomNumber,
          label: '',
        });
      }
    });

    const result = Array.from(merged.values()).sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRoom,
  getRooms,
};
