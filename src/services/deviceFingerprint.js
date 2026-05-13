const DEVICE_FP_KEY = 'device_fingerprint_v1';

const hashString = (input) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const buildFingerprintSeed = () => {
  const parts = [
    navigator.userAgent || '',
    navigator.language || '',
    navigator.platform || '',
    String(screen.width || ''),
    String(screen.height || ''),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  ];
  return parts.join('::');
};

export const getDeviceFingerprint = () => {
  const existing = localStorage.getItem(DEVICE_FP_KEY);
  if (existing) return existing;

  const entropy = `${Date.now()}::${Math.random()}`;
  const raw = `${buildFingerprintSeed()}::${entropy}`;
  const fp = `dfp_${hashString(raw)}`;
  localStorage.setItem(DEVICE_FP_KEY, fp);
  return fp;
};
