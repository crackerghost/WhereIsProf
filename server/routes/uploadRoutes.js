const express = require('express');
const multer = require('multer');
const { uploadBroadcastAttachment, getBroadcastAttachment } = require('../controllers/uploadController');
const { protect, faculty } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/broadcast-attachment', protect, faculty, upload.single('file'), uploadBroadcastAttachment);
router.get('/broadcast-attachment/:publicIdEncoded', getBroadcastAttachment);

module.exports = router;
