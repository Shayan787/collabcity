const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/projects - list all open projects
router.get('/', auth, async (req, res) => {
  try {
    const { skill, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: 'OPEN',
      ...(skill && { skills: { some: { skillName: { contains: skill, mode: 'insensitive' } } } }),
    };

    const projects = await prisma.project.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        poster: { select: { id: true, name: true, username: true, avatar: true, city: true, isVerified: true } },
        skills: true,
        _count: { select: { applications: true } },
      },
    });

    const total = await prisma.project.count({ where });
    res.json({ projects, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects - post a new project
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, budget, currency, deadline, skills } = req.body;
    if (!title || !description || !budget)
      return res.status(400).json({ message: 'Title, description, and budget required' });

    const project = await prisma.project.create({
      data: {
        title,
        description,
        budget: parseFloat(budget),
        currency: currency || 'PKR',
        deadline: deadline ? new Date(deadline) : null,
        posterId: req.user.id,
        skills: {
          create: (skills || []).map(s => ({ skillName: s })),
        },
      },
      include: {
        poster: { select: { id: true, name: true, username: true, avatar: true } },
        skills: true,
      },
    });

    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/projects/:id - get project details
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        poster: { select: { id: true, name: true, username: true, avatar: true, city: true, isVerified: true } },
        skills: true,
        applications: {
          include: {
            applicant: { select: { id: true, name: true, username: true, avatar: true, isVerified: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { applications: true } },
      },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Only show all applications to the poster
    if (project.posterId !== req.user.id) {
      project.applications = project.applications.filter(a => a.applicantId === req.user.id);
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects/:id/apply - apply to a project
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const { pitch } = req.body;
    if (!pitch) return res.status(400).json({ message: 'Pitch is required' });

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.posterId === req.user.id)
      return res.status(400).json({ message: 'Cannot apply to your own project' });
    if (project.status !== 'OPEN')
      return res.status(400).json({ message: 'Project is not open' });

    const application = await prisma.application.create({
      data: { projectId: req.params.id, applicantId: req.user.id, pitch },
    });

    // Notify project poster
    const io = req.app.get('io');
    if (io) {
      await prisma.notification.create({
        data: {
          userId: project.posterId,
          type: 'NEW_APPLICATION',
          message: `${req.user.name} applied to your project "${project.title}"`,
          data: { projectId: project.id, applicantId: req.user.id },
        },
      });
      io.to(`user:${project.posterId}`).emit('notification', { type: 'NEW_APPLICATION' });
    }

    res.status(201).json(application);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'Already applied' });
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/projects/:id/applications/:appId - accept or reject application
router.put('/:id/applications/:appId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACCEPTED', 'REJECTED'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project || project.posterId !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    const application = await prisma.application.update({
      where: { id: req.params.appId },
      data: { status },
      include: { applicant: true },
    });

    if (status === 'ACCEPTED') {
      await prisma.project.update({ where: { id: req.params.id }, data: { status: 'IN_PROGRESS' } });
    }

    // Notify applicant
    const io = req.app.get('io');
    if (io) {
      await prisma.notification.create({
        data: {
          userId: application.applicantId,
          type: `APPLICATION_${status}`,
          message: `Your application for "${project.title}" was ${status.toLowerCase()}`,
          data: { projectId: project.id },
        },
      });
      io.to(`user:${application.applicantId}`).emit('notification', { type: `APPLICATION_${status}` });
    }

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/projects/:id/complete - mark project as completed
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project || project.posterId !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/projects/my/posted - my posted projects
router.get('/my/posted', auth, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { posterId: req.user.id },
      include: { skills: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/projects/my/applied - projects I applied to
router.get('/my/applied', auth, async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      where: { applicantId: req.user.id },
      include: { project: { include: { poster: { select: { id: true, name: true, avatar: true } }, skills: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
