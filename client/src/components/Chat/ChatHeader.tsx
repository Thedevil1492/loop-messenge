import React from 'react';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { ArrowLeft, MoreVertical, Phone, Video, Users } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export const ChatHeader: React.FC = () => {
  const activeChatId = useStore((state) => state.activeChatId);
  const setActiveChatId = useStore((state) => state.setActiveChatId);
  const chats = useStore((state) => state.chats);
  const currentUser = useStore((state) => state.currentUser);
  const presence = useStore((state) => state.presence);
  const typing = useStore((state) => state.typing);

  const chat = chats.find((c) => c.id === activeChatId);
  if (!chat) return null;

  let title = chat.name || 'Group';
  let avatar = chat.avatar_url;
  let subtitle = '';
  let isOnline: boolean | undefined = undefined;

  // Check if someone in this chat is typing
  const chatTypers = typing[chat.id];
  const typingUserIds = chatTypers
    ? Object.keys(chatTypers).filter((uid) => uid !== currentUser?.id && chatTypers[uid])
    : [];

  if (typingUserIds.length > 0) {
    if (chat.type === 'DIRECT') {
      subtitle = 'typing...';
    } else {
      const names = typingUserIds
        .map((uid) => chat.participants.find((p) => p.id === uid)?.display_name.split(' ')[0] || 'Someone')
        .join(', ');
      subtitle = `${names} is typing...`;
    }
  } else if (chat.type === 'DIRECT') {
    const otherUser = chat.participants.find((p) => p.id !== currentUser?.id);
    if (otherUser) {
      title = otherUser.display_name;
      avatar = otherUser.avatar_url;
      const p = presence[otherUser.id];
      isOnline = p ? p.isOnline : !!otherUser.is_online;
      const lastSeen = p ? p.lastSeenAt : otherUser.last_seen_at;

      if (isOnline) {
        subtitle = 'online';
      } else if (lastSeen) {
        const date = new Date(lastSeen);
        if (isToday(date)) {
          subtitle = `last seen today at ${format(date, 'p')}`;
        } else if (isYesterday(date)) {
          subtitle = `last seen yesterday at ${format(date, 'p')}`;
        } else {
          subtitle = `last seen ${format(date, 'MMM d, p')}`;
        }
      } else {
        subtitle = 'offline';
      }
    }
  } else {
    // Group
    const count = chat.participants.length;
    const names = chat.participants.map((p) => p.display_name.split(' ')[0]).join(', ');
    subtitle = `${count} members: ${names}`;
  }

  return (
    <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 select-none">
      <div className="flex items-center gap-3 min-w-0">
        {/* Back button visible on mobile */}
        <button
          onClick={() => setActiveChatId(null)}
          className="md:hidden p-1.5 -ml-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Back to Chats"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Avatar src={avatar} name={title} size="md" isOnline={isOnline} />

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h2>
          <p
            className={`text-xs truncate font-medium ${
              subtitle.includes('typing')
                ? 'text-loop-600 dark:text-cyanAccent-400 animate-pulse'
                : subtitle === 'online'
                ? 'text-emerald-500 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Decorative / Future action placeholders */}
      <div className="flex items-center gap-1 text-slate-400">
        <button
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition opacity-60"
          title="Voice Call (Later)"
          disabled
        >
          <Phone className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition opacity-60"
          title="Video Call (Later)"
          disabled
        >
          <Video className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
