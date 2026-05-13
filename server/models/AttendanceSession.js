const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    classSession: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ClassSession',
    },
    classGroup: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ClassGroup',
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    totalStudents: {
      type: Number,
      required: true,
      min: 1,
    },
    dateKey: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

attendanceSessionSchema.index({ classSession: 1, dateKey: 1 }, { unique: true });

const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);

module.exports = AttendanceSession;
