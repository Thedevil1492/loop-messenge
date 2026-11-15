import { create } from 'zustand';
import type { User, Chat, Message, ActiveTab } from '../types.js';

interface PresenceState {
  isOnline: boolean;
  lastSeenAt: number;
}

interface StoreState {
  // Auth
  currentUser: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateCurrentUser: (user: Partial<User>) => void;
  logout: () => void;

  // Chats
  chats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  setChats: (chats: Chat[]) => void;
  addOrUpdateChat: (chat: Chat) => void;
  clearUnread: (chatId: string) => void;

  // Messages: Record<chatId, Message[]>
  messages: Record<string, Message[]>;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: 'DELIVERED' | 'READ') => void;
  updateClientMessageAck: (clientMessageId: string, serverMessage: Message) => void;

  // Presence: Record<userId, PresenceState>
  presence: Record<string, PresenceState>;
  setPresence: (userId: string, isOnline: boolean, lastSeenAt: number) => void;

  // Typing: Record<chatId, Record<userId, boolean>>
  typing: Record<string, Record<string, boolean>>;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;

  // Active Tab for Mobile Bottom Nav
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Quoted Reply
  replyingToMessage: Message | null;
  setReplyingToMessage: (msg: Message | null) => void;
  setReplyingTo: (msg: Message | null) => void;

  // Reactions
  addReaction: (chatId: string, messageId: string, emoji: string, userId: string) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Lightbox
  lightboxMedia: { url: string; type: 'IMAGE' | 'VIDEO'; name?: string } | null;
  setLightboxMedia: (media: { url: string; type: 'IMAGE' | 'VIDEO'; name?: string } | null) => void;
}

const savedUser = localStorage.getItem('loop_user');
let initialUser: User | null = null;
try {
  initialUser = savedUser ? JSON.parse(savedUser) : null;
} catch {}

export const useStore = create<StoreState>((set) => ({
  // Auth
  currentUser: initialUser,
  token: localStorage.getItem('loop_token'),
  setAuth: (user, token) => {
    localStorage.setItem('loop_token', token);
    localStorage.setItem('loop_user', JSON.stringify(user));
    set({ currentUser: user, token });
  },
  updateCurrentUser: (updated) =>
    set((state) => {
      const next = state.currentUser ? { ...state.currentUser, ...updated } : null;
      if (next) localStorage.setItem('loop_user', JSON.stringify(next));
      return { currentUser: next };
    }),
  logout: () => {
    localStorage.removeItem('loop_token');
    localStorage.removeItem('loop_user');
    set({ currentUser: null, token: null, chats: [], activeChatId: null, messages: {} });
  },

  // Chats
  chats: [],
  activeChatId: null,
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  setChats: (chats) => set({ chats }),
  addOrUpdateChat: (chat) =>
    set((state) => {
      const filtered = state.chats.filter((c) => c.id !== chat.id);
      return { chats: [chat, ...filtered] };
    }),
  clearUnread: (chatId) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, unread_count: 0 } : c)),
    })),

  // Messages
  messages: {},
  setMessages: (chatId, list) =>
    set((state) => ({
      messages: { ...state.messages, [chatId]: list },
    })),
  addMessage: (chatId, msg) =>
    set((state) => {
      const existing = state.messages[chatId] || [];
      // Prevent duplicates
      if (existing.some((m) => m.id === msg.id)) {
        return state;
      }
      return {
        messages: { ...state.messages, [chatId]: [...existing, msg] },
      };
    }),
  updateMessageStatus: (chatId, messageId, status) =>
    set((state) => {
      const chatMessages = state.messages[chatId];
      if (!chatMessages) return state;

      const updated = chatMessages.map((m) => {
        if (m.id === messageId) {
          // Status only advances forward: SENT -> DELIVERED -> READ
          if (m.delivery_status === 'READ') return m;
          if (status === 'DELIVERED' && m.delivery_status === 'DELIVERED') return m;
          return { ...m, delivery_status: status };
        }
        return m;
      });

      return {
        messages: { ...state.messages, [chatId]: updated },
      };
    }),
  updateClientMessageAck: (clientMessageId, serverMessage) =>
    set((state) => {
      const chatId = serverMessage.chat_id;
      const chatMessages = state.messages[chatId] || [];
      const updated = chatMessages.map((m) => (m.clientMessageId === clientMessageId ? serverMessage : m));
      return {
        messages: { ...state.messages, [chatId]: updated },
      };
    }),

  // Presence
  presence: {},
  setPresence: (userId, isOnline, lastSeenAt) =>
    set((state) => ({
      presence: {
        ...state.presence,
        [userId]: { isOnline, lastSeenAt },
      },
    })),

  // Typing
  typing: {},
  setTyping: (chatId, userId, isTyping) =>
    set((state) => {
      const chatTyping = { ...(state.typing[chatId] || {}) };
      if (isTyping) {
        chatTyping[userId] = true;
      } else {
        delete chatTyping[userId];
      }
      return {
        typing: { ...state.typing, [chatId]: chatTyping },
      };
    }),

  // Active Tab
  activeTab: 'CHATS',
  setActiveTab: (activeTab) => set({ activeTab }),

  // Reply
  replyingToMessage: null,
  setReplyingToMessage: (replyingToMessage) => set({ replyingToMessage }),
  setReplyingTo: (replyingToMessage) => set({ replyingToMessage }),

  // Add Reaction
  addReaction: (chatId, messageId, emoji, userId) =>
    set((state) => {
      const chatMsgs = state.messages[chatId] || [];
      const updated = chatMsgs.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const usersForEmoji = new Set(currentReactions[emoji] || []);
        if (usersForEmoji.has(userId)) {
          usersForEmoji.delete(userId);
        } else {
          usersForEmoji.add(userId);
        }
        if (usersForEmoji.size === 0) {
          delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = Array.from(usersForEmoji);
        }
        return { ...m, reactions: currentReactions };
      });
      return { messages: { ...state.messages, [chatId]: updated } };
    }),

  // Theme
  theme: (localStorage.getItem('loop_theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('loop_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: next };
    }),

  // Lightbox
  lightboxMedia: null,
  setLightboxMedia: (lightboxMedia) => set({ lightboxMedia }),
}));
