const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/match — AI-powered smart match
router.post('/', auth, async (req, res) => {
  try {
    const { goal } = req.body; // e.g. "I want to build a mobile app"

    // Get current user's full profile
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        vibeTags: { include: { vibeTag: true } },
        skills: { include: { skill: true } },
      },
    });

    // Get all other users with their profiles
    const allUsers = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      include: {
        vibeTags: { include: { vibeTag: true } },
        skills: { include: { skill: true } },
        ratingsReceived: { select: { score: true } },
      },
      take: 50,
    });

    if (allUsers.length === 0) {
      return res.json({ matches: [], reasoning: 'No other users found yet.' });
    }

    // Build compact profile representations for the AI
    const myProfile = {
      name: me.name,
      skills: me.skills.map(s => s.skill.name),
      vibeTags: me.vibeTags.map(v => v.vibeTag.name),
      city: me.city,
      bio: me.bio,
    };

    const candidates = allUsers.map(u => ({
      id: u.id,
      name: u.name,
      skills: u.skills.map(s => s.skill.name),
      vibeTags: u.vibeTags.map(v => v.vibeTag.name),
      city: u.city,
      bio: u.bio,
      avgRating: u.ratingsReceived.length
        ? (u.ratingsReceived.reduce((a, b) => a + b.score, 0) / u.ratingsReceived.length).toFixed(1)
        : null,
    }));

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a smart collaborator matching engine for CollabCity, a platform where GenZ find people to collab with.

My profile:
${JSON.stringify(myProfile, null, 2)}

My goal: "${goal || 'Find cool people to collaborate with'}"

Candidate profiles:
${JSON.stringify(candidates, null, 2)}

Return a JSON object (only JSON, no markdown) with this exact structure:
{
  "matches": [
    { "id": "<userId>", "score": <1-100>, "reason": "<one sentence why they match>" }
  ],
  "reasoning": "<2-3 sentence summary of your matching logic>"
}

Pick the top 5 best matches. Score based on: complementary skills, shared vibe, same city, goal alignment, rating. Be specific in reasons.`,
          },
        ],
      }),
    });

    const aiData = await response.json();
    const text = aiData.content?.[0]?.text || '{}';

    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ message: 'AI parsing error', raw: text });
    }

    // Enrich matches with full user data
    const enriched = await Promise.all(
      (parsed.matches || []).map(async match => {
        const user = allUsers.find(u => u.id === match.id);
        if (!user) return null;
        const avgRating = user.ratingsReceived.length
          ? (user.ratingsReceived.reduce((a, b) => a + b.score, 0) / user.ratingsReceived.length).toFixed(1)
          : null;
        return {
          ...match,
          user: {
            id: user.id, name: user.name, username: user.username,
            avatar: user.avatar, bio: user.bio, city: user.city, area: user.area,
            isOnline: user.isOnline, isVerified: user.isVerified,
            vibeTags: user.vibeTags, skills: user.skills, avgRating,
          },
        };
      })
    );

    res.json({
      matches: enriched.filter(Boolean),
      reasoning: parsed.reasoning || '',
    });
  } catch (err) {
    console.error('Match error:', err);
    res.status(500).json({ message: 'Smart match failed' });
  }
});

module.exports = router;
