const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, city, area } = req.body;

    if (!name || !username || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing)
      return res.status(400).json({ message: 'Email or username already taken' });

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, username, email, password: hashed, city, area },
      select: { id: true, name: true, username: true, email: true, city: true, area: true, avatar: true, isVerified: true },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, username: true, email: true,
        bio: true, avatar: true, city: true, area: true, isVerified: true,
        isOnline: true, createdAt: true,
        vibeTags: { include: { vibeTag: true } },
        skills: { include: { skill: true } },
        ratingsReceived: { select: { score: true } },
      },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
