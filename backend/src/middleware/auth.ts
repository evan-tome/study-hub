import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'studyhub-dev-secret';

export interface AuthRequest extends Request {
  user?: { userId: string; name: string; email: string; isAdmin?: boolean };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // get the Authorization header from the incoming request
  const header = req.headers.authorization;
  // check if the header exists and follows the format: "Bearer <token>"
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    // extract the token part after "Bearer "
    const token = header.slice(7);
    // verify and decode the JWT using the secret key
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; name: string; email: string };
    //attach the decoded user info to the request object so downstream routes can access it via req.user
    req.user = payload;

    // continue to the next middleware or route handler
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(payload: { userId: string; name: string; email: string; isAdmin?: boolean }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
