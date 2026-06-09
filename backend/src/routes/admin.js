const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Admin auth middleware
const adminAuth = async (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// GET /api/admin/stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [
      totalUsers, totalProjects, totalMessages, totalRatings,
      openProjects, completedProjects, newUsersToday, activeToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.message.count(),
      prisma.rating.count(),
      prisma.project.count({ where: { status: 'OPEN' } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.user.count({ where: { isOnline: true } }),
    ]);

    res.json({
      totalUsers, totalProjects, totalMessages, totalRatings,
      openProjects, completedProjects, newUsersToday, activeToday,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, username: true, email: true,
          city: true, isVerified: true, isOnline: true, createdAt: true,
          _count: { select: { postedProjects: true, ratingsReceived: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/verify
router.put('/users/:id/verify', adminAuth, async (req, res) => {
  try {
    const { isVerified } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/projects
router.get('/projects', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status } : {};

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          poster: { select: { id: true, name: true, email: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ projects, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/projects/:id
router.delete('/projects/:id', adminAuth, async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/projects/:id/status
router.put('/projects/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/payments — list all pending payment requests
router.get('/payments', adminAuth, async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { status },
        skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, username: true, isVerified: true, boostExpiresAt: true } },
        },
      }),
      prisma.payment.count({ where: { status } }),
    ]);

    res.json({ payments, total });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/payments/:id/approve — approve a payment request
router.put('/payments/:id/approve', adminAuth, async (req, res) => {
  try {
    const { adminNote } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'PENDING') return res.status(400).json({ message: 'Payment already processed' });

    // Activate the service
    if (payment.type === 'VERIFICATION') {
      await prisma.user.update({
        where: { id: payment.userId },
        data: { isVerified: true, verificationPaidAt: new Date() },
      });
    } else if (payment.type === 'BOOST') {
      const boostExpiresAt = new Date();
      boostExpiresAt.setDate(boostExpiresAt.getDate() + 7);
      await prisma.user.update({
        where: { id: payment.userId },
        data: { boostExpiresAt },
      });
    } else if (payment.type === 'MILESTONE_ESCROW') {
      // Handle milestone release
      if (payment.milestoneId) {
        await prisma.milestone.update({
          where: { id: payment.milestoneId },
          data: { status: 'RELEASED' },
        });
      }
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', adminNote, approvedAt: new Date() },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        type: 'PAYMENT_APPROVED',
        message: payment.type === 'VERIFICATION'
          ? '✓ Your verified badge has been activated!'
          : payment.type === 'BOOST'
          ? '🚀 Your profile boost has been activated for 7 days!'
          : '💸 Your payment has been approved!',
        data: { paymentId: payment.id },
      },
    });

    res.json({ message: 'Payment approved and service activated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/payments/:id/reject — reject a payment request
router.put('/payments/:id/reject', adminAuth, async (req, res) => {
  try {
    const { adminNote } = req.body;

    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'PENDING') return res.status(400).json({ message: 'Payment already processed' });

    await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'FAILED', adminNote },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        type: 'PAYMENT_REJECTED',
        message: `Your payment request was rejected. ${adminNote ? `Reason: ${adminNote}` : 'Please contact support.'}`,
        data: { paymentId: payment.id },
      },
    });

    res.json({ message: 'Payment rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const [recentUsers, recentProjects, recentMessages] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, name: true, email: true, city: true, createdAt: true },
      }),
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        include: { poster: { select: { name: true } } },
      }),
      prisma.message.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        include: { sender: { select: { name: true } } },
      }),
    ]);

    res.json({ recentUsers, recentProjects, recentMessages });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
