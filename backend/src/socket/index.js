const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const onlineUsers = new Map(); // userId -> socketId

const setupSocket = (io) => {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🟢 User connected: ${userId}`);

    // Track online status
    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeen: new Date() },
    });

    // Broadcast user online to others
    socket.broadcast.emit('user:online', { userId });

    // Join all user's rooms
    const rooms = await prisma.roomMember.findMany({ where: { userId } });
    rooms.forEach(r => socket.join(`room:${r.roomId}`));

    // Handle joining a room
    socket.on('room:join', async (roomId) => {
      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (member) {
        socket.join(`room:${roomId}`);
        socket.emit('room:joined', { roomId });
      }
    });

    // Handle sending a message
    socket.on('message:send', async ({ roomId, content, fileUrl, fileType, fileName, cloudinaryId, fileExpiresAt }) => {
      if (!content?.trim() && !fileUrl) return;

      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!member) return socket.emit('error', { message: 'Not a member of this room' });

      const message = await prisma.message.create({
        data: {
          roomId,
          senderId: userId,
          content: content?.trim() || '',
          fileUrl: fileUrl || null,
          fileType: fileType || null,
          fileName: fileName || null,
          cloudinaryId: cloudinaryId || null,
          fileExpiresAt: fileExpiresAt ? new Date(fileExpiresAt) : null,
        },
        include: { sender: { select: { id: true, name: true, username: true, avatar: true } } },
      });

      // Emit to all room members
      io.to(`room:${roomId}`).emit('message:new', message);

      // Notify offline room members
      const members = await prisma.roomMember.findMany({
        where: { roomId, userId: { not: userId } },
      });

      for (const m of members) {
        if (!onlineUsers.has(m.userId)) {
          await prisma.notification.create({
            data: {
              userId: m.userId,
              type: 'NEW_MESSAGE',
              message: `New message in your chat`,
              data: { roomId },
            },
          });

          // Send email to offline user
          const offlineUser = await prisma.user.findUnique({ where: { id: m.userId } });
          const sender = await prisma.user.findUnique({ where: { id: userId } });
          if (offlineUser && sender) {
            const preview = content.length > 60 ? content.slice(0, 60) + '...' : content;
            sendEmail({
              to: offlineUser.email,
              template: 'newMessage',
              data: { senderName: sender.name, preview, roomId },
            });
          }
        }
      }
    });

    // Handle typing indicator
    socket.on('typing:start', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('typing:start', { userId, roomId });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('typing:stop', { userId, roomId });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔴 User disconnected: ${userId}`);
      onlineUsers.delete(userId);

      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      });

      socket.broadcast.emit('user:offline', { userId });
    });
  });
};

module.exports = { setupSocket, onlineUsers };
