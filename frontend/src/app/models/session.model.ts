export interface SessionUser {
  id: string;
  name: string;
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
