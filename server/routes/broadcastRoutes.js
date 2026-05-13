const express = require('express');
const router = express.Router();
const { createBroadcast, getBroadcasts } = require('../controllers/broadcastController');
const { protect, faculty } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, faculty, createBroadcast)
  .get(protect, getBroadcasts);

module.exports = router;
