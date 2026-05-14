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

    const publicIdEncoded = encodeURIComponent(uploaded.public_id);
    const resourceType = uploaded.resource_type || 'raw';
    const format = uploaded.format || '';
    const fileName = req.file.originalname || `attachment.${format || 'bin'}`;
    const backendBaseUrl = `${req.protocol}://${req.get('host')}`;
    const deliveryUrl = `${backendBaseUrl}/api/uploads/broadcast-attachment/${publicIdEncoded}?rt=${encodeURIComponent(
      resourceType
    )}&fmt=${encodeURIComponent(format)}&name=${encodeURIComponent(fileName)}`;

    return res.status(201).json({
      url: deliveryUrl,
      directUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType,
      resourceType,
      format,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getBroadcastAttachment = async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicIdEncoded || '');
    const resourceType = String(req.query.rt || 'raw');
    const format = String(req.query.fmt || '').trim();
    const attachmentName = String(req.query.name || 'attachment').trim();

    if (!publicId || !format) {
      return res.status(400).json({ message: 'Invalid attachment reference' });
    }

    const signedDownloadUrl = cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: 'upload',
      attachment: attachmentName,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 10,
    });

    return res.redirect(signedDownloadUrl);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadBroadcastAttachment,
  getBroadcastAttachment,
};
