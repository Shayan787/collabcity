const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/milestones/project/:projectId
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const milestones = await prisma.milestone.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { order: 'asc' },
    });
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/milestones/project/:projectId — add milestone (poster only)
router.post('/project/:projectId', auth, async (req, res) => {
  try {
    const { title, description, amount, dueDate, order } = req.body;
    if (!title || !amount) return res.status(400).json({ message: 'Title and amount required' });

    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.posterId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const milestone = await prisma.milestone.create({
      data: {
        projectId: req.params.projectId,
        title,
        description,
        amount: parseFloat(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        order: order || 0,
      },
    });
    res.status(201).json(milestone);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/milestones/:id/status — update milestone status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'RELEASED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

    const project = milestone.project;
    const isPoster = project.posterId === req.user.id;

    // Poster can: APPROVE, RELEASE
    // Freelancer (accepted applicant) can: IN_PROGRESS, SUBMITTED
    const posterStatuses = ['APPROVED', 'RELEASED'];
    const freelancerStatuses = ['IN_PROGRESS', 'SUBMITTED'];

    if (posterStatuses.includes(status) && !isPoster)
      return res.status(403).json({ message: 'Only the project poster can do this' });

    if (freelancerStatuses.includes(status) && isPoster)
      return res.status(403).json({ message: 'Only the assigned freelancer can do this' });

    const updated = await prisma.milestone.update({
      where: { id: req.params.id },
      data: { status },
    });

    // If RELEASED — create a payment record
    if (status === 'RELEASED') {
      // Find accepted applicant
      const accepted = await prisma.application.findFirst({
        where: { projectId: project.id, status: 'ACCEPTED' },
      });
      if (accepted) {
        await prisma.payment.create({
          data: {
            userId: accepted.applicantId,
            type: 'MILESTONE_RELEASE',
            amount: milestone.amount,
            currency: project.currency,
            status: 'COMPLETED',
            milestoneId: milestone.id,
          },
        });
        // Notify freelancer
        const io = req.app.get('io');
        if (io) {
          await prisma.notification.create({
            data: {
              userId: accepted.applicantId,
              type: 'MILESTONE_RELEASED',
              message: `Payment released for milestone: "${milestone.title}" — ${milestone.amount.toLocaleString()} ${project.currency}`,
              data: { projectId: project.id, milestoneId: milestone.id },
            },
          });
          io.to(`user:${accepted.applicantId}`).emit('notification', { type: 'MILESTONE_RELEASED' });
        }
      }
    }

    // Notify poster when milestone SUBMITTED
    if (status === 'SUBMITTED') {
      const io = req.app.get('io');
      if (io) {
        await prisma.notification.create({
          data: {
            userId: project.posterId,
            type: 'MILESTONE_SUBMITTED',
            message: `Milestone "${milestone.title}" has been submitted for review`,
            data: { projectId: project.id, milestoneId: milestone.id },
          },
        });
        io.to(`user:${project.posterId}`).emit('notification', { type: 'MILESTONE_SUBMITTED' });
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/milestones/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });
    if (!milestone) return res.status(404).json({ message: 'Not found' });
    if (milestone.project.posterId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await prisma.milestone.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
