const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/users - discover people (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { city, skill, vibeTag, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      id: { not: req.user.id },
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(skill && { skills: { some: { skill: { name: { contains: skill, mode: 'insensitive' } } } } }),
      ...(vibeTag && { vibeTags: { some: { vibeTag: { name: { contains: vibeTag, mode: 'insensitive' } } } } }),
    };

    const users = await prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: [{ isOnline: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true, name: true, username: true, bio: true, avatar: true,
        city: true, area: true, isVerified: true, isOnline: true, lastSeen: true,
        vibeTags: { include: { vibeTag: true } },
        skills: { include: { skill: true } },
        ratingsReceived: { select: { score: true } },
        _count: { select: { ratingsReceived: true } },
      },
    });

    const total = await prisma.user.count({ where });
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:id - get single user profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, username: true, bio: true, avatar: true,
        city: true, area: true, isVerified: true, isOnline: true, lastSeen: true,
        createdAt: true,
        vibeTags: { include: { vibeTag: true } },
        skills: { include: { skill: true } },
        ratingsReceived: { select: { score: true, comment: true, giver: { select: { id: true, name: true, avatar: true } }, createdAt: true } },
        _count: { select: { ratingsReceived: true, postedProjects: true } },
      },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/profile - update own profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio, city, area, vibeTags, skills } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(city && { city }),
        ...(area !== undefined && { area }),
      },
    });

    if (vibeTags) {
      await prisma.userVibeTag.deleteMany({ where: { userId: req.user.id } });
      for (const tagName of vibeTags) {
        let tag = await prisma.vibeTag.findUnique({ where: { name: tagName } });
        if (!tag) tag = await prisma.vibeTag.create({ data: { name: tagName, emoji: '🏷️' } });
        await prisma.userVibeTag.create({ data: { userId: req.user.id, vibeTagId: tag.id } });
      }
    }

    if (skills) {
      await prisma.userSkill.deleteMany({ where: { userId: req.user.id } });
      for (const skillName of skills) {
        let skill = await prisma.skill.findUnique({ where: { name: skillName } });
        if (!skill) skill = await prisma.skill.create({ data: { name: skillName } });
        await prisma.userSkill.create({ data: { userId: req.user.id, skillId: skill.id } });
      }
    }

    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/:id/rate - rate a user
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5)
      return res.status(400).json({ message: 'Score must be 1-5' });

    if (req.params.id === req.user.id)
      return res.status(400).json({ message: 'Cannot rate yourself' });

    const rating = await prisma.rating.upsert({
      where: { giverId_receiverId: { giverId: req.user.id, receiverId: req.params.id } },
      update: { score, comment },
      create: { giverId: req.user.id, receiverId: req.params.id, score, comment },
    });

    res.json(rating);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/vibe-tags/all - list all vibe tags
router.get('/vibe-tags/all', auth, async (req, res) => {
  try {
    const tags = await prisma.vibeTag.findMany({ orderBy: { name: 'asc' } });
    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
