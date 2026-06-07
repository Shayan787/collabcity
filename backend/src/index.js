require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { setupSocket } = require('./socket');

const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const roomRoutes         = require('./routes/rooms');
const projectRoutes      = require('./routes/projects');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes       = require('./routes/upload');
const milestoneRoutes    = require('./routes/milestones');
const paymentRoutes      = require('./routes/payments');
const matchRoutes        = require('./routes/match');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET', 'POST'], credentials: true },
});

app.use(cors({
  origin: function(origin, callback) {
    // Allow all Vercel deployments, localhost, and the set FRONTEND_URL
    if (
      !origin ||
      origin.includes('vercel.app') ||
      origin.includes('localhost') ||
      origin === process.env.FRONTEND_URL
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/rooms',         roomRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload',        uploadRoutes);
app.use('/api/milestones',    milestoneRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/match',         matchRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0', timestamp: new Date() }));

setupSocket(io);
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 CollabCity v2 backend on port ${PORT}`));
