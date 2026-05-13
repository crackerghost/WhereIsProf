const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['student', 'faculty'],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    time: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    room: {
      type: String,
      required: true,
    },
    leadName: {
      type: String, // Faculty name for student view, or Class name for faculty view
    },
    day: {
      type: String,
      default: 'Monday',
    }
  },
  {
    timestamps: true,
  }
);

const Timetable = mongoose.model('Timetable', timetableSchema);

module.exports = Timetable;
