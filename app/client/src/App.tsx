import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore.js';
import { api } from './services/api.js';
import { socket } from './services/socket.js';
import { AuthModal } from './components/Auth/AuthModal.js';
import { ChatList } from './components/Sidebar/ChatList.js';
import { StatusView } from './components/Status/StatusView.js';
import { CallsView } from './components/Calls/CallsView.js';
import { SettingsView } from './components/Settings/SettingsView.js';
import { BottomNav } from './components/Navigation/BottomNav.js';
import { ChatHeader } from './components/Chat/ChatHeader.js';
import { MessageList } from './components/Chat/MessageList.js';
import { MessageInput } from './components/Chat/MessageInput.js';
import { MediaLightbox } from './components/Chat/MediaLightbox.js';
import { Avatar } from './components/UI/Avatar.js';
import {
  MessageSquare,
  CircleDashed,
  Phone,
  Settings,
  ShieldCheck,
  Lock,
  WifiOff,
} from 'lucide-react';
import type { ActiveTab } from './types.js';

export const App: React.FC = () => {
  const token = useStore((state) => state.token);
  const currentUser = useStore((state) => state.currentUser);
  const setAuth = useStore((state) => state.setAuth);
  const logout = useStore((state) => state.logout);
  const setChats = useStore((state) => state.setChats);
  const chats = useStore((state) => state.chats);
  const activeChatId = useStore((state) => state.activeChatId);
  const addMessage = useStore((state) => state.addMessage);
  const updateMessageStatus = useStore((state) => state.updateMessageStatus);
  const updateClientMessageAck = useStore((state) => state.updateClientMessageAck);
  const setPresence = useStore((state) => state.setPresence);
  const setTyping = useStore((state) => state.setTyping);
  const theme = useStore((state) => state.theme);
  const activeTab = useStore((state) => state.activeTab);
  const setActiveTab = useStore((state) => state.setActiveTab);

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
      } catch (err: any) {
        // Only log out if token is explicitly rejected (401 Unauthorized)
        const isAuthError = err?.status === 401 || err?.message?.includes('401');
        if (isAuthError) {
          console.error('Session expired (401), logging out:', err);
          logout();
        } else {
          // If server is cold-starting, sleeping, or temporarily offline, preserve session!
          console.warn('Server connecting or waking up. Preserving local session.');
        }
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

  const totalUnread = chats.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const desktopRailTabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'CHATS', label: 'Chats', icon: MessageSquare },
    { id: 'STATUS', label: 'Status', icon: CircleDashed },
    { id: 'CALLS', label: 'Calls', icon: Phone },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case 'STATUS':
        return <StatusView />;
      case 'CALLS':
        return <CallsView />;
      case 'SETTINGS':
        return <SettingsView />;
      case 'CHATS':
      default:
        return <ChatList />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-obsidian-bg text-zinc-900 dark:text-zinc-100 font-sans antialiased transition-colors">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-zinc-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 select-none z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are offline. Reconnecting to Loop private network...</span>
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop WhatsApp-style Left Navigation Rail */}
        <aside className="w-16 h-full flex-shrink-0 flex-col items-center justify-between py-4 bg-white dark:bg-obsidian-card border-r border-zinc-200 dark:border-obsidian-border select-none hidden md:flex z-20">
          {/* Top Rail Nav Icons */}
          <div className="flex flex-col items-center gap-2">
            {/* App Logo */}
            <div className="w-10 h-10 rounded-xl bg-mint-500/10 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 flex items-center justify-center mb-2 shadow-xs">
              <img src="/logo.svg" alt="Loop" className="w-6 h-6" />
            </div>

            {desktopRailTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`relative p-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-mint-500/15 text-mint-600 dark:text-mint-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-obsidian-surface'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.id === 'CHATS' && totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-mint-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Rail Icons (Settings & Avatar) */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setActiveTab('SETTINGS')}
              title="Settings"
              className={`p-2.5 rounded-xl transition-all ${
                activeTab === 'SETTINGS'
                  ? 'bg-mint-500/15 text-mint-600 dark:text-mint-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-obsidian-surface'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className="p-0.5 rounded-full hover:ring-2 hover:ring-mint-500 transition"
              title={currentUser.display_name}
            >
              <Avatar
                src={currentUser.avatar_url}
                name={currentUser.display_name}
                size="sm"
                isOnline={true}
              />
            </button>
          </div>
        </aside>

        {/* Sidebar Panel: Visible on desktop, or on mobile when no active chat is selected */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 h-full flex flex-col ${
            activeChatId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="flex-1 overflow-hidden">{renderActiveView()}</div>

          {/* Mobile Bottom Navigation (Only visible on mobile when no active chat is opened) */}
          <div className="md:hidden">
            <BottomNav />
          </div>
        </div>

        {/* Active Chat Conversation: Visible on desktop, or on mobile when a chat is selected */}
        <main
          className={`flex-1 flex flex-col h-full bg-slate-50/70 dark:bg-obsidian-bg relative ${
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
            <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none bg-radial from-mint-500/5 to-transparent">
              <div className="w-16 h-16 rounded-2xl bg-mint-500/10 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 flex items-center justify-center mb-4 shadow-sm border border-mint-500/20">
                <img src="/logo.svg" alt="Loop" className="w-10 h-10 drop-shadow-xs" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1.5 tracking-tight">
                Loop for Desktop
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed mb-6">
                Fast, minimalist, end-to-end encrypted messaging. Select a chat from the sidebar or start a new conversation.
              </p>
              <div className="flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-mint-500" />
                  E2E Encrypted
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-mint-500" />
                  Private Supabase Vault
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Lightbox Modal */}
      <MediaLightbox />
    </div>
  );
};
