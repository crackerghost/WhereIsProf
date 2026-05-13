import axios from 'axios';
import { getDeviceFingerprint } from './deviceFingerprint';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const API = axios.create({
  baseURL: API_BASE_URL,
});

const networkListeners = new Set();
let pendingRequests = 0;

const notifyNetworkActivity = () => {
  const isLoading = pendingRequests > 0;
  networkListeners.forEach((listener) => {
    try {
      listener(isLoading, pendingRequests);
    } catch {
      // no-op
    }
  });
};

const increasePending = () => {
  pendingRequests += 1;
  notifyNetworkActivity();
};

const decreasePending = () => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  notifyNetworkActivity();
};

export const subscribeNetworkActivity = (listener) => {
  if (typeof listener !== 'function') return () => {};
  networkListeners.add(listener);
  listener(pendingRequests > 0, pendingRequests);
  return () => networkListeners.delete(listener);
};

// Add a request interceptor to include JWT token
API.interceptors.request.use((req) => {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  })();
  req.headers['X-Device-Fingerprint'] = getDeviceFingerprint();
  if (user && user.token) {
    req.headers.Authorization = `Bearer ${user.token}`;
  }
  if (!req.__skipGlobalLoader) {
    req.__trackGlobalLoader = true;
    increasePending();
  }
  return req;
});

API.interceptors.response.use(
  (response) => {
    if (response?.config?.__trackGlobalLoader) {
      decreasePending();
    }
    return response;
  },
  (error) => {
    if (error?.config?.__trackGlobalLoader) {
      decreasePending();
    }
    return Promise.reject(error);
  }
);

// Auth API
export const login = (data) => API.post('/auth/login', { ...data, deviceFingerprint: getDeviceFingerprint() });
export const register = (data) => API.post('/auth/register', { ...data, deviceFingerprint: getDeviceFingerprint() });
export const getProfile = () => API.get('/auth/profile');
export const logout = () => API.post('/auth/logout', { deviceFingerprint: getDeviceFingerprint() });

// User API
export const getFaculty = () => API.get('/users/faculty');
export const getDepartments = () => API.get('/departments');
export const updateFacultyProfile = (data) => API.put('/users/profile', data);

// Departments
export const createDepartment = (data) => API.post('/departments', data);

// Classes
export const getClassGroups = (departmentId) =>
  API.get('/classes/groups', { params: departmentId ? { departmentId } : {} });
export const createClassGroup = (data) => API.post('/classes/groups', data);
export const getClassSessions = (params) => API.get('/classes/sessions', { params });
export const createClassSession = (data) => API.post('/classes/sessions', data);
export const setActiveClassGroup = (classGroupId) => API.patch('/classes/active', { classGroupId });

// Broadcast API
export const getBroadcasts = (classGroupId) =>
  API.get('/broadcasts', { params: classGroupId ? { classGroupId } : {} });
export const createBroadcast = (data) => API.post('/broadcasts', data);

// Classroom API
export const getTimetable = () => API.get('/classroom/timetable');
export const getAttendance = () => API.get('/classroom/attendance');
export const markAttendance = (data) => API.post('/classroom/attendance', data);
export const scanAttendanceQr = (qrToken) => API.post('/classroom/attendance/scan', { qrToken });
export const startAttendanceSession = (data) => API.post('/classroom/attendance/session/start', data);
export const refreshAttendanceSessionToken = (sessionId) => API.get(`/classroom/attendance/session/${sessionId}/token`);
export const getAttendanceSessionSummary = (sessionId) => API.get(`/classroom/attendance/session/${sessionId}/summary`);
export const stopAttendanceSession = (sessionId) => API.post(`/classroom/attendance/session/${sessionId}/stop`);
export const getStudentAttendanceSummary = () => API.get('/classroom/attendance/summary/student');
export const uploadBroadcastAttachment = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post('/uploads/broadcast-attachment', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Map/Rooms
export const getRooms = (floor) => API.get('/rooms', { params: floor ? { floor } : {} });

export default API;
