const mongoose = require('mongoose');

const classSessionSchema = new mongoose.Schema(
  {
    classGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassGroup',
      required: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    day: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

classSessionSchema.index({ classGroup: 1, day: 1, startTime: 1, endTime: 1, roomNumber: 1 });

const ClassSession = mongoose.model('ClassSession', classSessionSchema);

module.exports = ClassSession;
