const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulated payment gateway (replace with JazzCash/EasyPaisa/Stripe in production)
const simulatePayment = async ({ amount, currency, description }) => {
  // In production: call JazzCash/EasyPaisa API here
  // For now simulate a 95% success rate
  const success = Math.random() > 0.05;
  return { success, transactionId: `TXN_${Date.now()}` };
};

// POST /api/payments/verify-badge — purchase verified badge (499 PKR/month)
router.post('/verify-badge', auth, async (req, res) => {
  try {
    const PRICE = 499;
    const result = await simulatePayment({ amount: PRICE, currency: 'PKR', description: 'Verified Badge - 1 Month' });

    if (!result.success) return res.status(402).json({ message: 'Payment failed. Please try again.' });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isVerified: true, verificationPaidAt: new Date() },
    });

    await prisma.payment.create({
      data: {
        userId: req.user.id,
        type: 'VERIFICATION',
        amount: PRICE,
        currency: 'PKR',
        status: 'COMPLETED',
        metadata: { transactionId: result.transactionId },
      },
    });

    res.json({ message: 'Verified badge activated! ✓', transactionId: result.transactionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments/boost — purchase profile boost (500 PKR/week)
router.post('/boost', auth, async (req, res) => {
  try {
    const PRICE = 500;
    const result = await simulatePayment({ amount: PRICE, currency: 'PKR', description: 'Profile Boost - 1 Week' });

    if (!result.success) return res.status(402).json({ message: 'Payment failed. Please try again.' });

    const boostExpiresAt = new Date();
    boostExpiresAt.setDate(boostExpiresAt.getDate() + 7);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { boostExpiresAt },
    });

    await prisma.payment.create({
      data: {
        userId: req.user.id,
        type: 'BOOST',
        amount: PRICE,
        currency: 'PKR',
        status: 'COMPLETED',
        metadata: { transactionId: result.transactionId, boostExpiresAt },
      },
    });

    res.json({
      message: 'Profile boosted for 7 days! 🚀',
      boostExpiresAt,
      transactionId: result.transactionId,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/payments/my — payment history
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

module.exports = router;
