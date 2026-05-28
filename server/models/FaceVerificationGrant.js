const mongoose = require('mongoose');

const faceVerificationGrantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceFingerprint: {
      type: String,
      required: true,
      trim: true,
    },
    ip: {
      type: String,
      trim: true,
      default: '',
    },
    userAgent: {
      type: String,
      trim: true,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    confidence: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

faceVerificationGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FaceVerificationGrant', faceVerificationGrantSchema);
