const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const FaceVerificationGrant = require('../models/FaceVerificationGrant');
const { enrollFaceTemplate, verifyFaceTemplate } = require('../services/faceService');

const VERIFY_NONCE_TTL_MS = 2 * 60 * 1000;
const VERIFY_GRANT_TTL_SECONDS = 120;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_RATE_WINDOW_MS = 10 * 60 * 1000;

const getDeviceFingerprint = (req) =>
  req.body?.deviceFingerprint || req.headers['x-device-fingerprint'] || '';

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';

const isValidEnrollmentImages = (images) =>
  Array.isArray(images) && images.length >= 3 && images.length <= 10 && images.every((img) => typeof img === 'string' && img.length > 100);

const isValidVerificationImages = (images) =>
  Array.isArray(images) && images.length >= 8 && images.length <= 20 && images.every((img) => typeof img === 'string' && img.length > 100);

const signVerificationNonce = ({ userId, deviceFingerprint, nonce }) =>
  jwt.sign(
    {
      type: 'face_verify_nonce',
      userId: String(userId),
      deviceFingerprint,
      nonce,
    },
    process.env.JWT_SECRET,
    { expiresIn: Math.floor(VERIFY_NONCE_TTL_MS / 1000) }
  );

const verifySignedNonce = (token) => jwt.verify(token, process.env.JWT_SECRET);

const signFaceVerificationToken = ({ userId, jti }) =>
  jwt.sign(
    {
      type: 'face_verified',
      userId: String(userId),
      jti,
    },
    process.env.JWT_SECRET,
    { expiresIn: VERIFY_GRANT_TTL_SECONDS }
  );

const startFaceVerification = async (req, res) => {
  try {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ message: 'Only students can perform face verification' });
    }

    const deviceFingerprint = getDeviceFingerprint(req);
    if (!deviceFingerprint) {
      return res.status(400).json({ message: 'Device fingerprint is required' });
    }

    const recentAttempts = await FaceVerificationGrant.countDocuments({
      user: req.user._id,
      createdAt: { $gte: new Date(Date.now() - VERIFY_RATE_WINDOW_MS) },
    });

    if (recentAttempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many verification attempts. Try again later.' });
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const nonceToken = signVerificationNonce({
      userId: req.user._id,
      deviceFingerprint,
      nonce,
    });

    return res.json({ nonce, nonceToken, expiresInSeconds: Math.floor(VERIFY_NONCE_TTL_MS / 1000) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const enrollFace = async (req, res) => {
  try {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ message: 'Only students can enroll face profile' });
    }

    const { images } = req.body;
    if (!isValidEnrollmentImages(images)) {
      return res.status(400).json({ message: 'Provide 3 to 10 valid face images for enrollment' });
    }

    const result = await enrollFaceTemplate({ userId: String(req.user._id), images });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          faceTemplate: result.template,
          faceEnrolledAt: new Date(),
          faceEnrollmentVersion: result.modelVersion || 'arcface-v1',
          faceEnrollmentStatus: 'enrolled',
        },
      },
      { new: true }
    ).select('faceEnrolledAt faceEnrollmentVersion faceEnrollmentStatus');

    return res.status(201).json({
      message: 'Face enrollment complete',
      faceEnrolledAt: user.faceEnrolledAt,
      faceEnrollmentVersion: user.faceEnrollmentVersion,
      faceEnrollmentStatus: user.faceEnrollmentStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const verifyFace = async (req, res) => {
  try {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ message: 'Only students can verify face identity' });
    }

    const { images, nonce, nonceToken } = req.body;
    const deviceFingerprint = getDeviceFingerprint(req);

    if (!deviceFingerprint) {
      return res.status(400).json({ message: 'Device fingerprint is required' });
    }

    if (!isValidVerificationImages(images)) {
      return res.status(400).json({ message: 'Provide 8 to 20 valid face frames for verification' });
    }

    if (!nonce || !nonceToken) {
      return res.status(400).json({ message: 'Verification nonce is required' });
    }

    let decodedNonce;
    try {
      decodedNonce = verifySignedNonce(nonceToken);
    } catch {
      return res.status(400).json({ message: 'Invalid or expired verification nonce' });
    }

    if (
      decodedNonce?.type !== 'face_verify_nonce' ||
      decodedNonce?.nonce !== nonce ||
      String(decodedNonce?.userId) !== String(req.user._id) ||
      decodedNonce?.deviceFingerprint !== deviceFingerprint
    ) {
      return res.status(400).json({ message: 'Verification nonce mismatch' });
    }

    const user = await User.findById(req.user._id).select('faceTemplate faceEnrollmentStatus');
    if (!user?.faceTemplate || user?.faceEnrollmentStatus !== 'enrolled') {
      return res.status(400).json({ message: 'Face profile is not enrolled yet' });
    }

    const result = await verifyFaceTemplate({
      userId: String(req.user._id),
      images,
      template: user.faceTemplate,
    });

    if (!result?.liveness?.passed) {
      return res.status(401).json({
        message: 'Liveness validation failed. Blink and turn your head naturally and retry.',
        liveness: result?.liveness || null,
      });
    }

    if (!result?.matched) {
      return res.status(401).json({ message: 'Face verification failed' });
    }

    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + VERIFY_GRANT_TTL_SECONDS * 1000);
    await FaceVerificationGrant.create({
      user: req.user._id,
      jti,
      deviceFingerprint,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
      expiresAt,
      confidence: typeof result.confidence === 'number' ? result.confidence : null,
    });

    const faceVerificationToken = signFaceVerificationToken({ userId: req.user._id, jti });

    return res.json({
      faceVerificationToken,
      expiresInSeconds: VERIFY_GRANT_TTL_SECONDS,
      confidence: result.confidence,
      modelVersion: result.modelVersion || 'arcface-v1',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  startFaceVerification,
  enrollFace,
  verifyFace,
};
