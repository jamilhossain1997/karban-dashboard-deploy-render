import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

// Attach the JWT (if we have one) to every outgoing request.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('kanban_token');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// If the token is invalid/expired, bounce back to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('kanban_token');
      window.localStorage.removeItem('kanban_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface BoardMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  user: AuthUser;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  columnId: string;
}

export interface Column {
  id: string;
  title: string;
  position: number;
  boardId: string;
  tasks: Task[];
}

export interface Board {
  id: string;
  title: string;
  description?: string | null;
  ownerId: string;
  members: BoardMember[];
  columns?: Column[];
  _count?: { columns: number };
}
