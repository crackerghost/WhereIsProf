import { io } from 'socket.io-client';

let socketInstance = null;
let socketToken = null;

export const getSocket = (token) => {
  const normalizedToken = token || null;

  if (socketInstance && socketToken !== normalizedToken) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  if (!socketInstance) {
    socketInstance = io('http://localhost:5001', {
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
