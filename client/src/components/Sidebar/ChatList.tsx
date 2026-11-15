import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { DeliveryTicks } from '../UI/DeliveryTicks.js';
import { NewChatModal } from './NewChatModal.js';
import { NewGroupModal } from './NewGroupModal.js';
import { CameraModal } from '../Camera/CameraModal.js';
import { AdminModal } from '../Admin/AdminModal.js';
import {
  Search,
  MessageSquarePlus,
  Users,
  Camera,
  X,
  Sparkles,
  MoreVertical,
  ShieldCheck,
  Settings,
  Sun,
  Moon,
  KeyRound,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

type FilterType = 'ALL' | 'UNREAD' | 'DIRECT' | 'GROUPS';

export const ChatList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentUser = useStore((state) => state.currentUser);
  const chats = useStore((state) => state.chats);
  const activeChatId = useStore((state) => state.activeChatId);
  const setActiveChatId = useStore((state) => state.setActiveChatId);
  const presence = useStore((state) => state.presence);
  const typing = useStore((state) => state.typing);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const setActiveTab = useStore((state) => state.setActiveTab);

  const filteredChats = chats.filter((c) => {
    // 1. Text Search Filter
    const chatTitle =
      c.type === 'DIRECT'
        ? c.participants.find((p) => p.id !== currentUser?.id)?.display_name || 'Direct Chat'
        : c.name || 'Group';
    const lastContent = c.last_message?.content || '';
    const matchesSearch =
      chatTitle.toLowerCase().includes(search.toLowerCase()) ||
      lastContent.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Chip Filter
    if (activeFilter === 'UNREAD') return (c.unread_count || 0) > 0;
    if (activeFilter === 'DIRECT') return c.type === 'DIRECT';
    if (activeFilter === 'GROUPS') return c.type === 'GROUP';
    return true;
  });

  const formatTimestamp = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    if (isToday(date)) return format(date, 'p');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-obsidian-card border-r border-slate-200 dark:border-obsidian-border select-none">
      {/* Top Brand & Actions Header */}
      <div className="p-3.5 px-4 flex items-center justify-between border-b border-slate-100 dark:border-obsidian-border bg-white dark:bg-obsidian-card">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-mint-500/15 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 flex items-center justify-center font-bold">
            <svg viewBox="0 0 100 100" className="w-5 h-5 fill-none stroke-current" strokeWidth="11">
              <path d="M 32 38 C 22 38 18 46 18 50 C 18 56 24 64 34 64 C 44 64 52 50 56 46 C 60 42 66 36 74 36 C 82 36 86 44 86 50 C 86 56 80 64 70 64 C 60 64 54 52 50 48 C 46 44 40 38 32 38 Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Loop
          </h1>
        </div>

        {/* Right Top Actions (WhatsApp Style) */}
        <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
          <button
            onClick={() => setIsCameraOpen(true)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-obsidian-surface text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title="Open Camera"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-obsidian-surface transition"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-obsidian-surface text-mint-600 dark:text-mint-400 transition"
            title="New Conversation"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>

          {/* 3-Dots Menu Button */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-obsidian-surface text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
              title="More Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* 3-Dots Dropdown Menu */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 w-52 bg-white dark:bg-obsidian-card border border-slate-200 dark:border-obsidian-border rounded-2xl shadow-xl py-2 z-50 text-xs font-medium animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-obsidian-border/50">
                  <div className="pb-1.5">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsAdminOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left font-bold"
                    >
                      <ShieldCheck className="w-4 h-4 text-rose-500" />
                      <span>Admin Command Center</span>
                    </button>
                  </div>

                  <div className="py-1.5">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsNewGroupOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-obsidian-surface transition text-left"
                    >
                      <Users className="w-4 h-4 text-zinc-400" />
                      <span>New Group</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setActiveTab('SETTINGS');
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-obsidian-surface transition text-left"
                    >
                      <Settings className="w-4 h-4 text-zinc-400" />
                      <span>Settings</span>
                    </button>
                  </div>

                  <div className="pt-1.5">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        toggleTheme();
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-obsidian-surface transition text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        {theme === 'dark' ? (
                          <Sun className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Moon className="w-4 h-4 text-indigo-500" />
                        )}
                        <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inline Search Bar (Expands or Persistent) */}
      <div className={`px-3 pt-2 pb-2 transition-all ${isSearchOpen || search ? 'block' : 'block'}`}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-mint-500 border border-transparent dark:border-obsidian-border"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp Filter Chips Row */}
      <div className="px-3 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-obsidian-border">
        {(['ALL', 'UNREAD', 'DIRECT', 'GROUPS'] as FilterType[]).map((filter) => {
          const isActive = activeFilter === filter;
          const labels: Record<FilterType, string> = {
            ALL: 'All',
            UNREAD: 'Unread',
            DIRECT: 'Direct',
            GROUPS: 'Groups',
          };

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-mint-500/15 dark:bg-mint-500/25 text-mint-700 dark:text-mint-300 font-semibold'
                  : 'bg-slate-100 dark:bg-obsidian-surface text-zinc-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
              }`}
            >
              {labels[filter]}
            </button>
          );
        })}
      </div>

      {/* Conversation List Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-obsidian-border/50">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-obsidian-surface flex items-center justify-center mb-3 text-zinc-400">
              <MessageSquarePlus className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              No conversations found
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px]">
              Tap the new chat button above to connect with a contact.
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isDirect = chat.type === 'DIRECT';
            const otherUser = isDirect
              ? chat.participants.find((p) => p.id !== currentUser?.id)
              : null;
            const chatTitle = isDirect
              ? otherUser?.display_name || 'Direct Chat'
              : chat.name || 'Group';
            const chatAvatar = isDirect ? otherUser?.avatar_url : chat.avatar_url;

            // Presence
            const userPresence = otherUser ? presence[otherUser.id] : null;
            const isOnline = otherUser
              ? userPresence
                ? userPresence.isOnline
                : !!otherUser.is_online
              : false;

            // Typing
            const chatTypers = typing[chat.id];
            const isTyping =
              chatTypers &&
              Object.keys(chatTypers).some((uid) => uid !== currentUser?.id && chatTypers[uid]);

            const isActive = activeChatId === chat.id;
            const lastMsg = chat.last_message;
            const isOutgoing = lastMsg?.sender_id === currentUser?.id;

            return (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`flex items-center gap-3.5 px-3.5 py-3 cursor-pointer transition-colors relative ${
                  isActive
                    ? 'bg-slate-100 dark:bg-obsidian-surface border-l-3 border-mint-500'
                    : 'hover:bg-slate-50 dark:hover:bg-obsidian-surface/60'
                }`}
              >
                {/* Avatar with Verified Presence Indicator */}
                <Avatar
                  src={chatAvatar}
                  name={chatTitle}
                  size="md"
                  isOnline={isDirect ? isOnline : undefined}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2">
                      {chatTitle}
                    </h3>
                    <span
                      className={`text-[11px] whitespace-nowrap ${
                        (chat.unread_count || 0) > 0
                          ? 'text-mint-600 dark:text-mint-400 font-semibold'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {formatTimestamp(chat.updated_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0 pr-2">
                      {isTyping ? (
                        <p className="text-xs text-mint-600 dark:text-mint-400 font-medium truncate animate-pulse">
                          typing...
                        </p>
                      ) : (
                        <>
                          {isOutgoing && lastMsg && (
                            <DeliveryTicks
                              status={lastMsg.delivery_status}
                              className={lastMsg.delivery_status === 'READ' ? 'text-sky-400' : 'text-zinc-400'}
                            />
                          )}
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {lastMsg?.type === 'IMAGE'
                              ? '📷 Photo'
                              : lastMsg?.type === 'VIDEO'
                              ? '🎥 Video'
                              : lastMsg?.type === 'DOCUMENT'
                              ? '📄 Document'
                              : lastMsg?.type === 'AUDIO'
                              ? '🎤 Voice note'
                              : lastMsg?.content || 'No messages yet'}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Unread Badge Pill */}
                    {(chat.unread_count || 0) > 0 && (
                      <span className="bg-mint-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-xs flex-shrink-0">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (FAB) on Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-20">
        <button
          onClick={() => setIsNewChatOpen(true)}
          className="w-14 h-14 rounded-2xl bg-mint-500 hover:bg-mint-600 text-white flex items-center justify-center shadow-lg shadow-mint-500/30 transition transform active:scale-95"
          title="New Chat"
        >
          <MessageSquarePlus className="w-6 h-6" />
        </button>
      </div>

      {/* Modals */}
      {isNewChatOpen && <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />}
      {isNewGroupOpen && <NewGroupModal isOpen={isNewGroupOpen} onClose={() => setIsNewGroupOpen(false)} />}
      {isCameraOpen && (
        <CameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          mode="STORY"
        />
      )}
      {isAdminOpen && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
};
