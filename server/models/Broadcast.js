const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    classGroup: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ClassGroup',
    },
    subject: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'file'],
      default: 'text',
    },
    content: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Broadcast = mongoose.model('Broadcast', broadcastSchema);

module.exports = Broadcast;
