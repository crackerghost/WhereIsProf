const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
dotenv.config();
const connectDB = require('./config/db');
const User = require('./models/User');
const ClassSession = require('./models/ClassSession');
const { initSocket } = require('./socket');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const classRoutes = require('./routes/classRoutes');
const roomRoutes = require('./routes/roomRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint'],
  })
);
app.options(/.*/, cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/classroom', classroomRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('/', (req, res) => {
  res.send('WhereIsProf API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5001;
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

initSocket(io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error('Not authorized'));
  }
});

io.on('connection', (socket) => {
  emitFacultyStatuses().catch(() => {});

  socket.on('class:join', (classGroupId) => {
    if (classGroupId) {
      socket.join(`class:${classGroupId}`);
    }
  });

  socket.on('class:leave', (classGroupId) => {
    if (classGroupId) {
      socket.leave(`class:${classGroupId}`);
    }
  });
});

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getCurrentSessionForFaculty = (sessions, now) => {
  const currentDay = dayNames[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return sessions.find((session) => {
    if (session.day !== currentDay) return false;
    const start = timeToMinutes(session.startTime);
    const end = timeToMinutes(session.endTime);
    return currentMinutes >= start && currentMinutes <= end;
  });
};

const normalizeStatus = (status) => {
  if (status === 'available') return 'cabin';
  if (status === 'in-class') return 'in_classroom';
  return status || 'logoff';
};

const emitFacultyStatuses = async () => {
  const now = new Date();
  const faculty = await User.find({ role: 'faculty' }).select('-password');
  const facultyIds = faculty.map((user) => user._id);
  const sessions = await ClassSession.find({ faculty: { $in: facultyIds } });

  const byFaculty = new Map();
  sessions.forEach((session) => {
    const key = session.faculty.toString();
    if (!byFaculty.has(key)) {
      byFaculty.set(key, []);
    }
    byFaculty.get(key).push(session);
  });

  const payload = faculty.map((user) => {
    const userSessions = byFaculty.get(user._id.toString()) || [];
    const currentSession = getCurrentSessionForFaculty(userSessions, now);
    if (currentSession) {
      return {
        facultyId: user._id.toString(),
        status: 'in_classroom',
        classroomNumber: currentSession.roomNumber,
        classroomFloor: currentSession.floor,
      };
    }

    return {
      facultyId: user._id.toString(),
      status: normalizeStatus(user.status),
      classroomNumber: user.cabinRoomNumber || user.cabinNumber || null,
      classroomFloor: user.cabinFloor || null,
    };
  });

  io.emit('faculty:status', payload);
};

setInterval(() => {
  emitFacultyStatuses().catch(() => {});
}, 60000);

emitFacultyStatuses().catch(() => {});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
