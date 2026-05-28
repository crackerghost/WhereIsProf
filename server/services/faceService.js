const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || '';
const FACE_SERVICE_SECRET = process.env.FACE_SERVICE_SECRET || '';

const callFaceService = async (path, payload) => {
  if (!FACE_SERVICE_URL || !FACE_SERVICE_SECRET) {
    throw new Error('Face service is not configured');
  }

  const response = await fetch(`${FACE_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-face-service-secret': FACE_SERVICE_SECRET,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || data?.detail || 'Face service request failed';
    throw new Error(message);
  }

  return data;
};

const enrollFaceTemplate = async ({ userId, images }) => callFaceService('/face/enroll', { userId, images });
const verifyFaceTemplate = async ({ userId, images, template }) => callFaceService('/face/verify', { userId, images, template });

module.exports = {
  enrollFaceTemplate,
  verifyFaceTemplate,
};
