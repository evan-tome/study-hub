import { Router } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getCachedCourseName } from './courses';

const router = Router();

const sessionSelect = {
  id: true,
  courseCode: true,
  description: true,
  startTime: true,
  endTime: true,
  endedEarly: true,
} as const;

// enrich session data with course name
function enrich(n: any) {
  return { ...n, session: { ...n.session, courseName: getCachedCourseName(n.session.courseCode) } };
}

// ensure that for any sessions owned by the user that have ended, there is a corresponding "session_ended" notification in the inbox
async function ensureNotificationsForOwner(userId: string) {
  const now = new Date();
  const endedSessions = await prisma.studySession.findMany({
    where: { ownerId: userId, endTime: { lt: now } },
    select: { id: true, endTime: true },
  });
  for (const s of endedSessions) {
    const exists = await prisma.notification.findFirst({
      where: { userId, sessionId: s.id, type: 'session_ended' },
    });
    if (!exists) {
      await prisma.notification.create({
        data: { userId, sessionId: s.id, type: 'session_ended', createdAt: s.endTime },
      });
    }
  }
}

// GET /inbox - return the list of notifications for the authenticated user, sorted by most recent first
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    await ensureNotificationsForOwner(userId);
    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: { session: { select: sessionSelect } },
      orderBy: { createdAt: 'desc' },
    });

    // Batch-fetch requester names for join_request notifications
    const requesterIds = notifications
      .filter((n) => n.type === 'join_request' && n.requesterId)
      .map((n) => n.requesterId!);
    const requesters = requesterIds.length
      ? await prisma.user.findMany({ where: { id: { in: requesterIds } }, select: { id: true, name: true } })
      : [];
    const requesterMap = new Map(requesters.map((r) => [r.id, r.name]));

    res.json(notifications.map((n) => ({
      ...enrich(n),
      requesterName: n.requesterId ? (requesterMap.get(n.requesterId) ?? 'Unknown') : undefined,
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// GET /inbox/unread-count - return the count of unread notifications for the authenticated user
router.get('/unread-count', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    await ensureNotificationsForOwner(userId);
    const count = await prisma.notification.count({ where: { userId, read: false } });
    res.json({ count });
  } catch {
    res.status(500).json({ count: 0 });
  }
});

// POST /inbox/:id/read - mark a notification as read
router.post('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== req.user!.userId) {
      res.status(404).json({ error: 'Notification not found' }); return;
    }
    const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// submit attendance for a session - update the attendee count and mark the notification as read
router.post('/:id/attendance', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { attendeeCount } = req.body;
    if (typeof attendeeCount !== 'number' || attendeeCount < 0) {
      res.status(400).json({ error: 'attendeeCount must be a non-negative number' }); return;
    }
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== req.user!.userId) {
      res.status(404).json({ error: 'Notification not found' }); return;
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { attendeeCount, read: true },
      include: { session: { select: sessionSelect } },
    });
    res.json(enrich(updated));
  } catch {
    res.status(500).json({ error: 'Failed to submit attendance' });
  }
});

// approve a join request - add the requester to the session participants and mark the notification as approved
router.post('/:id/approve', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.userId;
    const notif = await prisma.notification.findUnique({ where: { id } });
    // validate notification exists, belongs to user, and is a pending join request
    if (!notif || notif.userId !== userId || notif.type !== 'join_request') {
      res.status(404).json({ error: 'Request not found' }); return;
    }
    // ensure request is still pending
    if (notif.requestStatus !== 'pending') {
      res.status(400).json({ error: 'Request already resolved' }); return;
    }
    const requesterId = notif.requesterId!;
    const session = await prisma.studySession.findUnique({
      where: { id: notif.sessionId },
      include: { participants: { select: { id: true } } },
    });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.maxParticipants !== null && session.participants.length >= session.maxParticipants) {
      res.status(400).json({ error: 'Session is full' }); return;
    }
    await prisma.studySession.update({
      where: { id: notif.sessionId },
      data: { participants: { connect: { id: requesterId } } },
    });
    const updated = await prisma.notification.update({
      where: { id },
      data: { requestStatus: 'approved', read: true },
      include: { session: { select: sessionSelect } },
    });
    // Notify the requester they were approved
    await prisma.notification.create({
      data: { userId: requesterId, sessionId: notif.sessionId, type: 'join_approved', requestStatus: 'resolved' },
    });
    res.json(enrich(updated));
  } catch {
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// deny a join request - mark the notification as denied but do not update session participants
router.post('/:id/deny', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.userId;
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId || notif.type !== 'join_request') {
      res.status(404).json({ error: 'Request not found' }); return;
    }
    if (notif.requestStatus !== 'pending') {
      res.status(400).json({ error: 'Request already resolved' }); return;
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { requestStatus: 'denied', read: true },
      include: { session: { select: sessionSelect } },
    });
    res.json(enrich(updated));
  } catch {
    res.status(500).json({ error: 'Failed to deny request' });
  }
});

export default router;
