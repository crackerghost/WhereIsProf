const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    usn: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      default: 'student',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    activeClassGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassGroup',
    },
    // Faculty specific fields
    cabinNumber: {
      type: String,
    },
    cabinFloor: {
      type: Number,
    },
    cabinRoomNumber: {
      type: String,
    },
    status: {
      type: String,
      enum: ['cabin', 'busy', 'logoff', 'in_classroom', 'available', 'in-class'],
      default: 'logoff',
    },
    activeDeviceFingerprint: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
