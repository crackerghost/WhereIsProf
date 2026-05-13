const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    floor: {
      type: Number,
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index({ floor: 1, roomNumber: 1 }, { unique: true });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
