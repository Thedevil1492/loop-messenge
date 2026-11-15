import type { User, Chat, Message, SearchContactUser, ContactRequestItem } from '../types.js';

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

  async anonymousRegister(payload: {
    displayName: string;
    anonTag?: string;
    seedHash: string;
    publicKey?: string;
    avatarUrl?: string;
  }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/anonymous-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create anonymous identity');
    return data;
  },

  async anonymousLogin(seedHash: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/anonymous-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seedHash }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to restore anonymous identity');
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

  async searchUsers(query: string): Promise<SearchContactUser[]> {
    const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to search users');
    return data.users;
  },

  async sendContactRequest(targetUserId: string): Promise<{ success: boolean; requestId: string; status: string }> {
    const res = await fetch(`${API_BASE}/contacts/request`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetUserId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send contact request');
    return data;
  },

  async getPendingRequests(): Promise<ContactRequestItem[]> {
    const res = await fetch(`${API_BASE}/contacts/pending`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch pending requests');
    return data.requests;
  },

  async respondContactRequest(
    requestId: string,
    action: 'ACCEPT' | 'DECLINE'
  ): Promise<{ success: boolean; status: string; chatId?: string }> {
    const res = await fetch(`${API_BASE}/contacts/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ requestId, action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to respond to request');
    return data;
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

  async uploadBase64(
    dataUrl: string,
    filename?: string
  ): Promise<{ url: string; name: string; size: number; mimeType: string; mediaType: 'IMAGE' }> {
    const res = await fetch(`${API_BASE}/upload-base64`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ dataUrl, filename }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload camera capture');
    return data;
  },

  // Phone + OTP Authentication
  async sendOtp(phone: string): Promise<{ success: boolean; message: string; code?: string }> {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
    return data;
  },

  async verifyOtp(payload: {
    phone: string;
    code: string;
    displayName?: string;
    username?: string;
  }): Promise<{ token: string; user: User; isNewUser: boolean }> {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification failed');
    return data;
  },

  // Status Stories
  async getStatusUpdates(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/status`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch status updates');
    return data.statuses || [];
  },

  async createStatusUpdate(text: string, mediaUrl?: string, bgColor?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, mediaUrl, bgColor }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post status update');
    return data.status;
  },

  // Call Logs
  async getCallLogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/calls`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch call logs');
    return data.calls || [];
  },

  async logCall(payload: {
    receiverId: string;
    chatId?: string;
    type: 'AUDIO' | 'VIDEO';
    status: 'MISSED' | 'COMPLETED' | 'DECLINED';
    duration?: number;
  }): Promise<{ success: boolean; callId: string }> {
    const res = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to log call');
    return data;
  },
};
