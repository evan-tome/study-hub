import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { requireAuth, signToken, AuthRequest } from '../middleware/auth';

// get admin emails from env, no duplicates
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean) // split, trim, remove empty
);

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // ensure all fields are present
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }
    // ensure email belonds to ontario tech student (@ontariotechu.net)
    if (!String(email).toLowerCase().endsWith('@ontariotechu.net')) {
      res.status(400).json({ error: 'You must use an @ontariotechu.net email address' });
      return;
    }
    // ensure password is at least 6 characters
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    // use default program and year if not provided
    const { program = '', year = 0 } = req.body;
    const passwordHash = await bcrypt.hash(password, 10); // encrypt password
    // create user in database
    const user = await prisma.user.create({ data: { name, email, passwordHash, program, year: Number(year) } });

    // generate JWT token for the new user
    const token = signToken({ userId: user.id, name: user.name, email: user.email, isAdmin: ADMIN_EMAILS.has(user.email) });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) { // ensure email exists and password matches
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // generate JWT token for the user
    const token = signToken({ userId: user.id, name: user.name, email: user.email, isAdmin: ADMIN_EMAILS.has(user.email) });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

// get current user info, requires authentication
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json(req.user); // return user data
});

// get user profile
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, program: true, year: true, courses: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// update profile
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { courses, program, year } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        courses: Array.isArray(courses) ? courses : [],
        program: String(program ?? ''),
        year: Math.min(10, Math.max(1, Number(year) || 1)), // enforce year between 1 and 10
      },
      select: { id: true, name: true, email: true, program: true, year: true, courses: true },
    });
    res.json(user);
  } catch (err) {
    console.error('[PUT /profile]', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
