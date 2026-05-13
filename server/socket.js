let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;
};

const getSocket = () => ioInstance;

module.exports = { initSocket, getSocket };
