import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore.js';
import { api } from './services/api.js';
import { socket } from './services/socket.js';
import { AuthModal } from './components/Auth/AuthModal.js';
import { ChatList } from './components/Sidebar/ChatList.js';
import { ChatHeader } from './components/Chat/ChatHeader.js';
import { MessageList } from './components/Chat/MessageList.js';
import { MessageInput } from './components/Chat/MessageInput.js';
import { MediaLightbox } from './components/Chat/MediaLightbox.js';
import { MessageSquare, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';

export const App: React.FC = () => {
  const token = useStore((state) => state.token);
  const currentUser = useStore((state) => state.currentUser);
  const setAuth = useStore((state) => state.setAuth);
  const logout = useStore((state) => state.logout);
  const setChats = useStore((state) => state.setChats);
  const activeChatId = useStore((state) => state.activeChatId);
  const addMessage = useStore((state) => state.addMessage);
  const updateMessageStatus = useStore((state) => state.updateMessageStatus);
  const updateClientMessageAck = useStore((state) => state.updateClientMessageAck);
  const setPresence = useStore((state) => state.setPresence);
  const setTyping = useStore((state) => state.setTyping);
  const theme = useStore((state) => state.theme);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Sync theme class to documentElement
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Track browser network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch authenticated user profile on mount
  useEffect(() => {
    if (!token) return;

    let isCurrent = true;
    async function initUser() {
      try {
        const { user } = await api.getMe();
        if (isCurrent) {
          setAuth(user, token!);
        }
      } catch (err) {
        console.error('Session expired or invalid:', err);
        logout();
      }
    }
    initUser();

    return () => {
      isCurrent = false;
    };
  }, [token]);

  // Initialize chats and WebSocket connection
  useEffect(() => {
    if (!token || !currentUser) return;

    let isCurrent = true;
    async function loadChats() {
      try {
        const chatList = await api.getChats();
        if (isCurrent) setChats(chatList);
      } catch (err) {
        console.error('Failed to load chats:', err);
      }
    }
    loadChats();

    // Connect to WebSocket
    socket.connect(token);

    // Event handlers
    const unsubNewMsg = socket.on('message:new', ({ message }) => {
      addMessage(message.chat_id, message);
      // Refresh chat list to update last message & unread badge
      api.getChats().then((list) => setChats(list)).catch(() => {});

      // If active chat is open, immediately acknowledge as READ
      if (activeChatId === message.chat_id) {
        socket.send('message:receipt', {
          messageId: message.id,
          chatId: message.chat_id,
          status: 'READ',
        });
      }
    });

    const unsubAck = socket.on('message:ack', ({ clientMessageId, message }) => {
      updateClientMessageAck(clientMessageId, message);
      api.getChats().then((list) => setChats(list)).catch(() => {});
    });

    const unsubReceipt = socket.on('message:receipt_update', ({ messageId, chatId, status }) => {
      updateMessageStatus(chatId, messageId, status);
      api.getChats().then((list) => setChats(list)).catch(() => {});
    });

    const unsubPresence = socket.on('presence:change', ({ userId, isOnline, lastSeenAt }) => {
      setPresence(userId, isOnline, lastSeenAt);
    });

    const unsubTyping = socket.on('typing:change', ({ chatId, userId, isTyping }) => {
      setTyping(chatId, userId, isTyping);
    });

    return () => {
      isCurrent = false;
      unsubNewMsg();
      unsubAck();
      unsubReceipt();
      unsubPresence();
      unsubTyping();
      socket.disconnect();
    };
  }, [token, currentUser?.id, activeChatId]);

  if (!currentUser || !token) {
    return <AuthModal />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1 text-xs font-semibold flex items-center justify-center gap-1.5 select-none z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are offline. Messages will sync automatically upon reconnection.</span>
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / ChatList: Visible on desktop, or on mobile when no active chat is selected */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 h-full ${
            activeChatId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatList />
        </div>

        {/* Active Chat Conversation: Visible on desktop, or on mobile when a chat is selected */}
        <div
          className={`flex-1 flex flex-col h-full bg-slate-50/70 dark:bg-slate-950 relative ${
            !activeChatId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeChatId ? (
            <>
              <ChatHeader />
              <MessageList />
              <MessageInput />
            </>
          ) : (
            /* Desktop Empty State */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none bg-radial from-loop-500/5 to-transparent">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-loop-600 to-cyanAccent-500 p-0.5 shadow-xl shadow-loop-500/20 mb-4 animate-float">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[22px] flex items-center justify-center">
                  <img src="/logo.svg" alt="Loop" className="w-12 h-12 drop-shadow" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Loop for Web
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
                Fast, private, realtime messaging. Select a conversation from the sidebar or start a new chat.
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Independent Backend
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-loop-500" />
                  PWA Ready
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      <MediaLightbox />
    </div>
  );
};
