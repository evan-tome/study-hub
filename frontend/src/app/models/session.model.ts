export interface SessionUser {
  id: string;
  name: string;
  program: string;
  year: number;
}

export interface StudySession {
  id: string;
  courseCode: string;
  courseName: string;
  topics: string[];
  description: string;
  owner: SessionUser;
  participants: SessionUser[];
  startTime: string;
  endTime: string;
  locationType: 'room' | 'online';
  location: string;
  maxParticipants: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionDto {
  courseCode: string;
  topics: string[];
  description: string;
  startTime: string;
  endTime: string;
  locationType: 'room' | 'online';
  location: string;
  maxParticipants?: number | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  author: SessionUser;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

export interface AdminStats {
  userCount: number;
  sessionCount: number;
  messageCount: number;
  onlineCount: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  program: string;
  year: number;
  courses: string[];
  createdAt: string;
  _count: { owned: number; joined: number; messages: number };
}

export interface AdminSession {
  id: string;
  courseCode: string;
  description: string;
  owner: { id: string; name: string; email: string };
  startTime: string;
  endTime: string;
  locationType: string;
  location: string;
  createdAt: string;
  _count: { participants: number; messages: number };
}

export interface SqlView {
  key: string;
  label: string;
  description?: string;
}

export interface Notification {
  id: string;
  sessionId: string;
  type: 'session_ended' | 'session_created' | 'join_request' | 'join_approved';
  attendeeCount: number | null;
  requesterId?: string;
  requesterName?: string;
  requestStatus?: string;
  read: boolean;
  createdAt: string;
  session: {
    id: string;
    courseCode: string;
    courseName: string;
    description: string;
    startTime: string;
    endTime: string;
    endedEarly: boolean;
  };
}

export interface RecommendedSession extends StudySession {
  score: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  program: string;
  year: number;
  courses: string[];
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
