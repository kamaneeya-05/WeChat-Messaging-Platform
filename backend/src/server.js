const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const supportRoutes = require('./routes/supportRoutes');
const { configureSockets } = require('./sockets/chatSocket');
const { configureSupportSockets } = require('./sockets/supportSocket');

dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL;
const corsOptions = {
  origin: CLIENT_URL || true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 1. Connect to Database
connectDB();

// 2. Setup Routes

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/support', supportRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../message/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Configure Socket.io events
configureSockets(io);
configureSupportSockets(io);

app.get('/', (req, res) => {
  res.send('Messaging API is running');
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
});

const PORT = process.env.PORT || 5000;

server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    console.error('Server error:', error);
    process.exit(1);
  }

  const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges.`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use. Please stop the process using this port or set a different PORT environment variable.`);
      process.exit(1);
      break;
    default:
      console.error('Server error:', error);
      process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
