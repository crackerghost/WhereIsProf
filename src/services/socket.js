import { io } from 'socket.io-client';

const SOCKET_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');

let socketInstance = null;
let socketToken = null;

export const getSocket = (token) => {
  const normalizedToken = token || null;

  if (socketInstance && socketToken !== normalizedToken) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  if (!socketInstance) {
    socketInstance = io(SOCKET_BASE_URL, {
      auth: normalizedToken ? { token: normalizedToken } : {},
      transports: ['websocket', 'polling'],
    });
    socketToken = normalizedToken;
  } else if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
};

export const resetSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    socketToken = null;
  }
};
