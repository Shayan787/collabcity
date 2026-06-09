const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/leaderboard?city=Karachi&limit=20
router.get('/', auth, async (req, res) => {
  try {
    const { city = 'Karachi', limit = 20 } = req.query;

    const users = await prisma.user.findMany({
      where: {
        city: { contains: city, mode: 'insensitive' },
        ratingsReceived: { some: {} },
      },
      select: {
        id: true, name: true, username: true, avatar: true,
        city: true, area: true, isVerified: true, isOnline: true,
        boostExpiresAt: true,
        vibeTags: { include: { vibeTag: true } },
        ratingsReceived: { select: { score: true } },
        _count: { select: { postedProjects: true, ratingsReceived: true } },
      },
      take: parseInt(limit) * 3, // get more then sort
    });

    // Calculate score for each user
    const scored = users.map(u => {
      const ratings = u.ratingsReceived;
      const avgRating = ratings.length
        ? ratings.reduce((a, b) => a + b.score, 0) / ratings.length
        : 0;
      const ratingCount = ratings.length;
      const projectCount = u._count.postedProjects;
      const isBoosted = u.boostExpiresAt && new Date(u.boostExpiresAt) > new Date();

      // Score formula: avg rating * 20 + rating count * 5 + projects * 3 + boost bonus
      const score = Math.round(avgRating * 20 + ratingCount * 5 + projectCount * 3 + (isBoosted ? 10 : 0));

      return {
        ...u,
        avgRating: avgRating.toFixed(1),
        ratingCount,
        projectCount,
        score,
        isBoosted,
      };
    });

    // Sort by score descending and take top N
    const ranked = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit))
      .map((u, i) => ({ ...u, rank: i + 1 }));

    res.json(ranked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
