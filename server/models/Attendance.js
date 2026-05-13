const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    attendanceSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
    },
    classSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSession',
    },
    classGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassGroup',
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    subject: {
      type: String,
      required: true,
    },
    dateKey: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent'],
      default: 'Present',
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ student: 1, attendanceSession: 1 }, { unique: true, sparse: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
