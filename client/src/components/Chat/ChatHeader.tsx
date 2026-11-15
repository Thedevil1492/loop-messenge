import React from 'react';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { ArrowLeft, MoreVertical, Phone, Video, ShieldCheck, Lock } from 'lucide-react';
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
    <div className="h-16 px-3 md:px-4 flex items-center justify-between border-b border-zinc-200 dark:border-obsidian-border bg-white/95 dark:bg-obsidian-card/95 backdrop-blur-md z-10 select-none transition-colors">
      <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
        {/* Back button visible on mobile */}
        <button
          onClick={() => setActiveChatId(null)}
          className="md:hidden p-2 -ml-1 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition active:scale-95"
          title="Back to Chats"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Avatar src={avatar} name={title} size="md" isOnline={isOnline} />

        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {title}
            </h2>
            <span
              className="text-mint-600 dark:text-mint-400 opacity-80 hover:opacity-100 transition cursor-help"
              title="Loop Private End-to-End Encryption Active"
            >
              <Lock className="w-3.5 h-3.5" />
            </span>
          </div>
          <p
            className={`text-xs truncate font-medium ${
              subtitle.includes('typing')
                ? 'text-mint-600 dark:text-mint-400 animate-pulse'
                : subtitle === 'online'
                ? 'text-mint-600 dark:text-mint-400'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
        <button
          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-obsidian-surface hover:text-mint-600 dark:hover:text-mint-400 transition"
          title="Start Audio Call"
        >
          <Phone className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-obsidian-surface hover:text-mint-600 dark:hover:text-mint-400 transition"
          title="Start Video Call"
        >
          <Video className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-obsidian-surface hover:text-zinc-800 dark:hover:text-zinc-200 transition"
          title="Chat Options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
