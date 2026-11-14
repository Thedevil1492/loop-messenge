import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { DeliveryTicks } from '../UI/DeliveryTicks.js';
import { NewChatModal } from './NewChatModal.js';
import { NewGroupModal } from './NewGroupModal.js';
import {
  Search,
  MessageSquarePlus,
  Users,
  Sun,
  Moon,
  LogOut,
  ImageIcon,
  Video,
  FileText,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export const ChatList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);

  const currentUser = useStore((state) => state.currentUser);
  const chats = useStore((state) => state.chats);
  const activeChatId = useStore((state) => state.activeChatId);
  const setActiveChatId = useStore((state) => state.setActiveChatId);
  const presence = useStore((state) => state.presence);
  const typing = useStore((state) => state.typing);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const logout = useStore((state) => state.logout);

  const filteredChats = chats.filter((c) => {
    const chatTitle =
      c.type === 'DIRECT'
        ? c.participants.find((p) => p.id !== currentUser?.id)?.display_name || 'Direct Chat'
        : c.name || 'Group';
    const lastContent = c.last_message?.content || '';
    return (
      chatTitle.toLowerCase().includes(search.toLowerCase()) ||
      lastContent.toLowerCase().includes(search.toLowerCase())
    );
  });

  const formatTimestamp = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    if (isToday(date)) return format(date, 'p');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      {/* Top App / User Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar
            src={currentUser?.avatar_url}
            name={currentUser?.display_name || 'Me'}
            size="md"
            className="ring-2 ring-loop-500/20"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <span>{currentUser?.display_name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {currentUser?.bio || 'Looping in private'}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
          <button
            onClick={() => setIsNewChatOpen(true)}
            title="New 1:1 Chat"
            className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-loop-500 transition"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsNewGroupOpen(true)}
            title="New Group Chat"
            className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-loop-500 transition"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-loop-500"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80 dark:divide-slate-800/40">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
              <MessageSquarePlus className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No conversations yet
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
              Tap the new chat button above to connect with a contact.
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = activeChatId === chat.id;

            // Compute recipient or group details
            let title = chat.name || 'Group';
            let avatar = chat.avatar_url;
            let isOnline: boolean | undefined = undefined;

            if (chat.type === 'DIRECT') {
              const otherUser = chat.participants.find((p) => p.id !== currentUser?.id);
              if (otherUser) {
                title = otherUser.display_name;
                avatar = otherUser.avatar_url;
                const p = presence[otherUser.id];
                isOnline = p ? p.isOnline : !!otherUser.is_online;
              }
            }

            // Check if someone in this chat is typing
            const chatTypers = typing[chat.id];
            const isPeerTyping =
              chatTypers && Object.keys(chatTypers).some((uid) => uid !== currentUser?.id && chatTypers[uid]);

            const lastMsg = chat.last_message;
            const isOutgoing = lastMsg && lastMsg.sender_id === currentUser?.id;

            return (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full flex items-center gap-3 p-3.5 transition text-left ${
                  isActive
                    ? 'bg-loop-50 dark:bg-slate-800/90 border-l-4 border-loop-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Avatar src={avatar} name={title} size="md" isOnline={isOnline} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {title}
                    </h3>
                    {lastMsg && (
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                        {formatTimestamp(lastMsg.created_at)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-500 dark:text-slate-400 truncate">
                      {isPeerTyping ? (
                        <span className="text-loop-600 dark:text-cyanAccent-400 font-medium italic animate-pulse">
                          typing...
                        </span>
                      ) : lastMsg ? (
                        <>
                          {isOutgoing && (
                            <DeliveryTicks status={lastMsg.delivery_status} className="flex-shrink-0" />
                          )}
                          {chat.type === 'GROUP' && !isOutgoing && lastMsg.sender_name && (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {lastMsg.sender_name.split(' ')[0]}:
                            </span>
                          )}
                          {lastMsg.type === 'IMAGE' && (
                            <span className="flex items-center gap-1 italic">
                              <ImageIcon className="w-3.5 h-3.5" /> Photo
                            </span>
                          )}
                          {lastMsg.type === 'VIDEO' && (
                            <span className="flex items-center gap-1 italic">
                              <Video className="w-3.5 h-3.5" /> Video
                            </span>
                          )}
                          {lastMsg.type === 'DOCUMENT' && (
                            <span className="flex items-center gap-1 italic">
                              <FileText className="w-3.5 h-3.5" /> Document
                            </span>
                          )}
                          {lastMsg.type === 'TEXT' && (
                            <span className="truncate">{lastMsg.content}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No messages</span>
                      )}
                    </div>

                    {/* Unread badge */}
                    {chat.unread_count > 0 && (
                      <span className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-loop-600 text-white text-[11px] font-bold flex items-center justify-center shadow-sm shadow-loop-600/30">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Modals */}
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <NewGroupModal isOpen={isNewGroupOpen} onClose={() => setIsNewGroupOpen(false)} />
    </div>
  );
};
