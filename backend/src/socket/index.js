const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const onlineUsers = new Map();

const setupSocket = (io) => {
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

    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeen: new Date() },
    });

    socket.broadcast.emit('user:online', { userId });

    const rooms = await prisma.roomMember.findMany({ where: { userId } });
    rooms.forEach(r => socket.join(`room:${r.roomId}`));

    socket.on('room:join', async (roomId) => {
      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (member) {
        socket.join(`room:${roomId}`);
        socket.emit('room:joined', { roomId });
      }
    });

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

      io.to(`room:${roomId}`).emit('message:new', message);

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
        }
      }
    });

    socket.on('typing:start', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('typing:start', { userId, roomId });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(`room:${roomId}`).emit('typing:stop', { userId, roomId });
    });

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