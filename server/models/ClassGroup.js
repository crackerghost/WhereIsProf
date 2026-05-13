const mongoose = require('mongoose');

const classGroupSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
      min: 0,
    },
    semester: {
      type: String,
      default: '',
      trim: true,
    },
    section: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

classGroupSchema.index({ department: 1, name: 1, floor: 1, semester: 1, section: 1 }, { unique: true });

const ClassGroup = mongoose.model('ClassGroup', classGroupSchema);

module.exports = ClassGroup;
