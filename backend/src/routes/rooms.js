const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/rooms - get all rooms for current user
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, username: true, avatar: true, isOnline: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/rooms/direct - create or get DM room with another user
router.post('/direct', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });

    // Check if DM room already exists
    const existing = await prisma.room.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: req.user.id } } },
          { members: { some: { userId } } },
        ],
      },
      include: { members: { include: { user: { select: { id: true, name: true, username: true, avatar: true, isOnline: true } } } } },
    });

    if (existing) return res.json(existing);

    const room = await prisma.room.create({
      data: {
        type: 'DIRECT',
        creatorId: req.user.id,
        members: {
          create: [{ userId: req.user.id }, { userId }],
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true, username: true, avatar: true, isOnline: true } } } } },
    });

    res.status(201).json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/rooms/collab - create a collab room
router.post('/collab', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Room name required' });

    const room = await prisma.room.create({
      data: {
        name,
        type: 'COLLAB',
        creatorId: req.user.id,
        members: { create: [{ userId: req.user.id }] },
      },
      include: { members: { include: { user: { select: { id: true, name: true, username: true, avatar: true, isOnline: true } } } } },
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/rooms/:id/join - join a collab room
router.post('/:id/join', auth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.type !== 'COLLAB') return res.status(400).json({ message: 'Can only join collab rooms' });

    const already = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: req.params.id, userId: req.user.id } },
    });
    if (already) return res.status(400).json({ message: 'Already a member' });

    await prisma.roomMember.create({ data: { roomId: req.params.id, userId: req.user.id } });
    res.json({ message: 'Joined room' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/rooms/:id/messages - get messages for a room
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: req.params.id, userId: req.user.id } },
    });
    if (!member) return res.status(403).json({ message: 'Not a member of this room' });

    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await prisma.message.findMany({
      where: { roomId: req.params.id },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, username: true, avatar: true } } },
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/rooms/collab/discover - discover open collab rooms
router.get('/collab/discover', auth, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { type: 'COLLAB' },
      include: {
        creator: { select: { id: true, name: true, username: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
