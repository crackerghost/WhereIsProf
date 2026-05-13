const cloudinary = require('../config/cloudinary');

const uploadBroadcastAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ message: 'Cloudinary server env vars are missing' });
    }

    const mimeType = req.file.mimetype || 'application/octet-stream';
    const base64 = req.file.buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: 'whereisprof/broadcasts',
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    return res.status(201).json({
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadBroadcastAttachment,
};
