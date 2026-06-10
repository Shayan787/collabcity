const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { sendOTPEmail } = require('../services/emailService');
const prisma = new PrismaClient();

// Helper — generate 6 digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/auth/send-otp — send OTP to email before registration
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    // Check if email already registered
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    // Invalidate any existing OTPs for this email
    await prisma.oTP.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    // Create new OTP — expires in 10 minutes
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.create({ data: { email, code, expiresAt } });

    // Send email
    await sendOTPEmail({ to: email, otp: code, name });

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp — verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code required' });

    const otp = await prisma.oTP.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) return res.status(400).json({ message: 'Invalid or expired code' });

    // Mark OTP as used
    await prisma.oTP.update({ where: { id: otp.id }, data: { used: true } });

    res.json({ message: 'Email verified', verified: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, city, area, emailVerified } = req.body;

    if (!name || !username || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    // Require email verification
    if (!emailVerified)
      return res.status(400).json({ message: 'Email not verified' });

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
