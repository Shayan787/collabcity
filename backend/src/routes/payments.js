const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/payments/request — user submits a payment request
router.post('/request', auth, async (req, res) => {
  try {
    const { type, phoneNumber, paymentMethod, transactionId } = req.body;

    if (!type) return res.status(400).json({ message: 'Payment type required' });
    if (!phoneNumber) return res.status(400).json({ message: 'Phone number required' });
    if (!paymentMethod) return res.status(400).json({ message: 'Payment method required' });
    if (!transactionId) return res.status(400).json({ message: 'Transaction ID required' });

    const PRICES = {
      VERIFICATION: 499,
      BOOST: 500,
    };

    const amount = PRICES[type];
    if (!amount) return res.status(400).json({ message: 'Invalid payment type' });

    // Check if user already has a pending request for same type
    const existing = await prisma.payment.findFirst({
      where: { userId: req.user.id, type, status: 'PENDING' },
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending request for this. Please wait for admin approval.' });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        type,
        amount,
        currency: 'PKR',
        status: 'PENDING',
        phoneNumber,
        paymentMethod,
        metadata: {
          requestedAt: new Date(),
          userName: req.user.name,
          userEmail: req.user.email,
          transactionId,
        },
      },
    });

    // Notify via in-app notification to admin (we store it as a system notification)
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        type: 'PAYMENT_REQUESTED',
        message: `Your ${type === 'VERIFICATION' ? 'verified badge' : 'profile boost'} request has been submitted. Admin will approve within 24 hours.`,
        data: { paymentId: payment.id },
      },
    });

    res.status(201).json({
      message: 'Payment request submitted! Admin will approve within 24 hours.',
      payment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/payments/my — get my payment history
router.get('/my', auth, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { milestone: { select: { title: true } } },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/payments/status — check if user has active services
router.get('/status', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isVerified: true, boostExpiresAt: true },
    });

    const isBoosted = user.boostExpiresAt && new Date(user.boostExpiresAt) > new Date();
    const boostDaysLeft = isBoosted
      ? Math.ceil((new Date(user.boostExpiresAt) - new Date()) / (1000 * 60 * 60 * 24))
      : 0;

    // Check pending requests
    const pendingVerify = await prisma.payment.findFirst({
      where: { userId: req.user.id, type: 'VERIFICATION', status: 'PENDING' },
    });
    const pendingBoost = await prisma.payment.findFirst({
      where: { userId: req.user.id, type: 'BOOST', status: 'PENDING' },
    });

    res.json({
      isVerified: user.isVerified,
      isBoosted,
      boostDaysLeft,
      pendingVerify: !!pendingVerify,
      pendingBoost: !!pendingBoost,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
