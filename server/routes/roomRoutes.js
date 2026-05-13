const express = require('express');
const router = express.Router();
const { createRoom, getRooms } = require('../controllers/roomController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(getRooms)
  .post(protect, admin, createRoom);

module.exports = router;
