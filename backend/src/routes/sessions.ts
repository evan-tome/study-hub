import { Router } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getCachedCourseName } from './courses';

const enrich = (s: any) => ({ ...s, courseName: getCachedCourseName(s.courseCode) });

const router = Router();

const include = {
  owner: { select: { id: true, name: true, program: true, year: true } },
  participants: { select: { id: true, name: true, program: true, year: true } },
  _count: { select: { participants: true } },
} as const;

router.get('/', async (req, res) => {
  try {
    const { course } = req.query;
    const sessions = await prisma.studySession.findMany({
      where: course ? { courseCode: { contains: course as string, mode: 'insensitive' } } : undefined,
      orderBy: { startTime: 'asc' },
      include,
    });
    res.json(sessions.map(enrich));
  } catch {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { courseCode, topics, description, startTime, endTime, locationType, location, maxParticipants } = req.body;
    if (!courseCode || !description || !startTime || !endTime || !locationType || !location) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const session = await prisma.studySession.create({
      data: {
        courseCode,
        topics: Array.isArray(topics) ? topics : [],
        description,
        ownerId: req.user!.userId,
        participants: { connect: { id: req.user!.userId } },
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        locationType,
        location,
        maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      },
      include,
    });
    const enrolled = await prisma.user.findMany({
      where: { courses: { has: courseCode }, id: { not: req.user!.userId } },
      select: { id: true },
    });
    if (enrolled.length > 0) {
      await prisma.notification.createMany({
        data: enrolled.map((u) => ({ userId: u.id, sessionId: session.id, type: 'session_created' })),
      });
    }
    res.status(201).json(enrich(session));
  } catch {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const session = await prisma.studySession.findUnique({ where: { id }, include });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    res.json(enrich(session));
  } catch {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const session = await prisma.studySession.findUnique({ where: { id } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.ownerId !== req.user!.userId) {
      res.status(403).json({ error: 'Only the session owner can edit it' });
      return;
    }
    const { courseCode, topics, description, startTime, endTime, locationType, location, maxParticipants } = req.body;
    if (!courseCode || !description || !startTime || !endTime || !locationType || !location) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const updated = await prisma.studySession.update({
      where: { id },
      data: {
        courseCode,
        topics: Array.isArray(topics) ? topics : [],
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        locationType,
        location,
        maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      },
      include,
    });
    res.json(enrich(updated));
  } catch {
    res.status(500).json({ error: 'Failed to update session' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const session = await prisma.studySession.findUnique({ where: { id } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.ownerId !== req.user!.userId) {
      res.status(403).json({ error: 'Only the session owner can delete it' });
      return;
    }
    if (session.endTime <= new Date()) {
      res.status(403).json({ error: 'Ended sessions cannot be deleted' });
      return;
    }
    await prisma.studySession.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

router.post('/:id/end', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const session = await prisma.studySession.findUnique({ where: { id } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.ownerId !== req.user!.userId) {
      res.status(403).json({ error: 'Only the session owner can end it' });
      return;
    }
    const now = new Date();
    if (session.startTime > now) { res.status(400).json({ error: 'Session has not started yet' }); return; }
    if (session.endTime <= now) { res.status(400).json({ error: 'Session has already ended' }); return; }
    const updated = await prisma.studySession.update({
      where: { id },
      data: { endTime: now, endedEarly: true },
      include,
    });
    const existing = await prisma.notification.findFirst({ where: { userId: req.user!.userId, sessionId: id } });
    if (!existing) {
      await prisma.notification.create({ data: { userId: req.user!.userId, sessionId: id, type: 'session_ended' } });
    }
    res.json(enrich(updated));
  } catch {
    res.status(500).json({ error: 'Failed to end session' });
  }
});

router.get('/:id/join-status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const pending = await prisma.notification.findFirst({
      where: { sessionId: id, requesterId: req.user!.userId, type: 'join_request', requestStatus: 'pending' },
    });
    res.json({ status: pending ? 'pending' : 'none' });
  } catch {
    res.status(500).json({ error: 'Failed to check join status' });
  }
});

router.post('/:id/request-join', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.userId;
    const session = await prisma.studySession.findUnique({
      where: { id },
      include: { participants: { select: { id: true } } },
    });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.ownerId === userId) { res.status(400).json({ error: 'You own this session' }); return; }
    if (session.participants.some((p) => p.id === userId)) { res.status(400).json({ error: 'Already a participant' }); return; }
    if (new Date(session.endTime) <= new Date()) { res.status(400).json({ error: 'Session has ended' }); return; }
    if (session.maxParticipants !== null && session.participants.length >= session.maxParticipants) {
      res.status(400).json({ error: 'Session is full' }); return;
    }
    const existing = await prisma.notification.findFirst({
      where: { sessionId: id, requesterId: userId, type: 'join_request', requestStatus: 'pending' },
    });
    if (existing) { res.status(400).json({ error: 'Request already pending' }); return; }
    await prisma.notification.create({
      data: { userId: session.ownerId, sessionId: id, type: 'join_request', requesterId: userId, requestStatus: 'pending' },
    });
    res.json({ status: 'pending' });
  } catch {
    res.status(500).json({ error: 'Failed to send join request' });
  }
});

router.post('/:id/join', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const session = await prisma.studySession.findUnique({ where: { id } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    const updated = await prisma.studySession.update({
      where: { id },
      data: { participants: { connect: { id: req.user!.userId } } },
      include,
    });
    res.json(enrich(updated));
  } catch {
    res.status(500).json({ error: 'Failed to join session' });
  }
});

router.post('/:id/leave', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const session = await prisma.studySession.findUnique({ where: { id } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    const updated = await prisma.studySession.update({
      where: { id },
      data: { participants: { disconnect: { id: req.user!.userId } } },
      include,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to leave session' });
  }
});

const msgInclude = { author: { select: { id: true, name: true } } } as const;

router.get('/:id/messages', async (req, res) => {
  try {
    const id = String(req.params.id);
    const after = req.query.after as string | undefined;
    const messages = await prisma.message.findMany({
      where: {
        sessionId: id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: msgInclude,
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: 'Message content is required' }); return; }
    const session = await prisma.studySession.findUnique({ where: { id } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    const message = await prisma.message.create({
      data: { content: content.trim(), sessionId: id, authorId: req.user!.userId },
      include: msgInclude,
    });
    res.status(201).json(message);
  } catch {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
