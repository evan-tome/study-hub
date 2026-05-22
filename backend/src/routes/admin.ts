import { Router, Response, NextFunction } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user?.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}

router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const [userCount, sessionCount, messageCount, onlineCount] = await Promise.all([
      prisma.user.count(),
      prisma.studySession.count(),
      prisma.message.count(),
      prisma.studySession.count({ where: { startTime: { lte: now }, endTime: { gte: now } } }),
    ]);
    res.json({ userCount, sessionCount, messageCount, onlineCount });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/users', requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, program: true,
        year: true, courses: true, createdAt: true,
        _count: { select: { owned: true, joined: true, messages: true } },
      },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.delete('/users/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    if (id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/sessions', requireAdmin, async (_req, res) => {
  try {
    const sessions = await prisma.studySession.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, courseCode: true, description: true,
        owner: { select: { id: true, name: true, email: true } },
        startTime: true, endTime: true, locationType: true,
        location: true, createdAt: true,
        _count: { select: { participants: true, messages: true } },
      },
    });
    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.delete('/sessions/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.studySession.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Named SQL queries exposed as CSV-exportable views for PowerBI / Excel
// Prisma implicit M2M join table "_Participants": A = StudySession.id, B = User.id
const VIEWS: Record<string, { label: string; description: string; sql: string }> = {
  user_activity: {
    label: 'User Activity',
    description: 'All users with session ownership, participation, and message totals',
    sql: `
      SELECT
        u.id                                        AS user_id,
        u.name,
        u.email,
        u.program,
        u.year,
        array_to_string(u.courses, ', ')            AS courses,
        u."createdAt"                               AS registered_at,
        COUNT(DISTINCT s.id)::int                   AS sessions_owned,
        COUNT(DISTINCT p."A")::int                  AS sessions_joined,
        COUNT(DISTINCT m.id)::int                   AS messages_sent
      FROM "User" u
      LEFT JOIN "StudySession" s  ON s."ownerId"  = u.id
      LEFT JOIN "_Participants" p ON p."B"         = u.id
      LEFT JOIN "Message" m       ON m."authorId"  = u.id
      GROUP BY u.id, u.name, u.email, u.program, u.year, u.courses, u."createdAt"
      ORDER BY u."createdAt" DESC
    `,
  },
  session_details: {
    label: 'Session Details',
    description: 'Full session info with owner, duration, participant and message counts',
    sql: `
      SELECT
        ss.id                                                                         AS session_id,
        ss."courseCode"                                                               AS course_code,
        array_to_string(ss.topics, ', ')                                              AS topics,
        ss.description,
        u.name                                                                        AS owner_name,
        u.email                                                                       AS owner_email,
        ss."startTime"                                                                AS start_time,
        ss."endTime"                                                                  AS end_time,
        ROUND(EXTRACT(EPOCH FROM (ss."endTime" - ss."startTime")) / 60)::int          AS duration_minutes,
        ss."locationType"                                                             AS location_type,
        ss.location,
        COUNT(DISTINCT p."B")::int                                                    AS participant_count,
        COUNT(DISTINCT m.id)::int                                                     AS message_count,
        ss."createdAt"                                                                AS created_at
      FROM "StudySession" ss
      JOIN  "User" u            ON u.id       = ss."ownerId"
      LEFT JOIN "_Participants" p ON p."A"    = ss.id
      LEFT JOIN "Message" m       ON m."sessionId" = ss.id
      GROUP BY ss.id, ss."courseCode", ss.topics, ss.description,
               u.name, u.email, ss."startTime", ss."endTime",
               ss."locationType", ss.location, ss."createdAt"
      ORDER BY ss."startTime" DESC
    `,
  },
  course_popularity: {
    label: 'Course Popularity',
    description: 'Sessions, participants, and engagement totals per course code',
    sql: `
      SELECT
        ss."courseCode"                                                               AS course_code,
        COUNT(DISTINCT ss.id)::int                                                    AS total_sessions,
        COUNT(DISTINCT p."B")::int                                                    AS total_participants,
        COUNT(DISTINCT ss."ownerId")::int                                             AS unique_organizers,
        COUNT(DISTINCT m.id)::int                                                     AS total_messages,
        ROUND(AVG(EXTRACT(EPOCH FROM (ss."endTime" - ss."startTime")) / 60))::int    AS avg_duration_minutes,
        MIN(ss."startTime")                                                           AS first_session,
        MAX(ss."startTime")                                                           AS latest_session
      FROM "StudySession" ss
      LEFT JOIN "_Participants" p ON p."A"         = ss.id
      LEFT JOIN "Message" m       ON m."sessionId" = ss.id
      GROUP BY ss."courseCode"
      ORDER BY total_sessions DESC
    `,
  },
  participant_roster: {
    label: 'Participant Roster',
    description: 'Flat join of every user–session attendance record (pivot-table ready)',
    sql: `
      SELECT
        ss.id              AS session_id,
        ss."courseCode"    AS course_code,
        ss."startTime"     AS session_start,
        ss."endTime"       AS session_end,
        u.id               AS user_id,
        u.name             AS user_name,
        u.email,
        u.program,
        u.year,
        (ss."ownerId" = u.id) AS is_owner
      FROM "_Participants" p
      JOIN "StudySession" ss ON ss.id  = p."A"
      JOIN "User" u          ON u.id   = p."B"
      ORDER BY ss."startTime" DESC, u.name
    `,
  },
  message_log: {
    label: 'Message Log',
    description: 'Every chat message with session and author context',
    sql: `
      SELECT
        m.id           AS message_id,
        m."sessionId"  AS session_id,
        ss."courseCode" AS course_code,
        u.id           AS user_id,
        u.name         AS user_name,
        u.email,
        m.content,
        m."createdAt"  AS sent_at
      FROM "Message" m
      JOIN "User" u          ON u.id  = m."authorId"
      JOIN "StudySession" ss ON ss.id = m."sessionId"
      ORDER BY m."createdAt" DESC
    `,
  },
};

router.get('/views', requireAdmin, (_req, res) => {
  res.json(
    Object.entries(VIEWS).map(([key, { label, description }]) => ({ key, label, description }))
  );
});

router.post('/query', requireAdmin, async (req, res) => {
  try {
    const { view } = req.body;
    if (!view || !VIEWS[view]) {
      res.status(400).json({ error: 'Unknown view' });
      return;
    }
    const rows = await prisma.$queryRawUnsafe(VIEWS[view].sql);
    // Safety net: stringify with BigInt → number conversion in case a cast was missed
    const json = JSON.stringify(rows, (_, v) => (typeof v === 'bigint' ? Number(v) : v));
    res.setHeader('Content-Type', 'application/json');
    res.send(json);
  } catch (err) {
    console.error('[admin/query]', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Query failed', detail: msg });
  }
});

export default router;
