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
