import type { User, Chat, Message } from '../types.js';

export const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = `${BASE_URL}/api`;

export function getMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return `${BASE_URL}${url}`;
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('loop_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  async register(email: string, password: string, displayName: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register');
    return data;
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to login');
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get current user');
    return data;
  },

  async updateProfile(displayName?: string, bio?: string, avatarUrl?: string): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ displayName, bio, avatarUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    return data;
  },

  async getChats(): Promise<Chat[]> {
    const res = await fetch(`${API_BASE}/chats`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch chats');
    return data.chats;
  },

  async createDirectChat(recipientId: string): Promise<{ chatId: string }> {
    const res = await fetch(`${API_BASE}/chats/direct`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipientId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create direct chat');
    return data;
  },

  async createGroupChat(name: string, participantIds: string[], description?: string): Promise<{ chatId: string }> {
    const res = await fetch(`${API_BASE}/chats/group`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, participantIds, description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create group chat');
    return data;
  },

  async getMessages(chatId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch messages');
    return data.messages;
  },

  async markAsRead(chatId: string): Promise<void> {
    await fetch(`${API_BASE}/chats/${chatId}/read`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  async searchUsers(query: string): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to search users');
    return data.users;
  },

  async uploadFile(file: File): Promise<{
    url: string;
    name: string;
    size: number;
    mimeType: string;
    mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('loop_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload file');
    return data;
  },
};
