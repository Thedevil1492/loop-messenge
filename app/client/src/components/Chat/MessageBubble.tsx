import React, { useState } from 'react';
import type { Message } from '../../types.js';
import { useStore } from '../../store/useStore.js';
import { DeliveryTicks } from '../UI/DeliveryTicks.js';
import { getMediaUrl } from '../../services/api.js';
import { FileText, Download, Reply, Smile, Check } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isGroup: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isGroup }) => {
  const currentUser = useStore((state) => state.currentUser);
  const setLightboxMedia = useStore((state) => state.setLightboxMedia);
  const setReplyingTo = useStore((state) => state.setReplyingTo);
  const addReaction = useStore((state) => state.addReaction);

  const [showPicker, setShowPicker] = useState(false);

  const isOutgoing = message.sender_id === currentUser?.id;
  const timeStr = format(new Date(message.created_at), 'p');
  const fullMediaUrl = getMediaUrl(message.media_url);

  const quickEmojis = ['❤️', '👍', '😂', '🔥', '🙏', '😮'];

  // Format file size
  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleReact = (emoji: string) => {
    if (currentUser) {
      addReaction(message.chat_id, message.id, emoji, currentUser.id);
    }
    setShowPicker(false);
  };

  // Active reactions
  const reactionEntries = Object.entries(message.reactions || {}).filter(
    ([_, users]) => Array.isArray(users) && users.length > 0
  );

  return (
    <div
      className={`group relative flex flex-col mb-1.5 ${
        isOutgoing ? 'items-end' : 'items-start'
      }`}
    >
      {/* Floating Action Menu (Reply & React) */}
      <div
        className={`absolute -top-3 z-10 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-full px-1.5 py-0.5 shadow-md shadow-black/10 transition-all ${
          isOutgoing ? 'right-2' : 'left-2'
        }`}
      >
        <button
          onClick={() => setReplyingTo(message)}
          className="p-1 rounded-full text-zinc-500 hover:text-mint-600 dark:hover:text-mint-400 hover:bg-zinc-100 dark:hover:bg-obsidian-card transition"
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 rounded-full text-zinc-500 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-obsidian-card transition"
          title="Add Reaction"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Emoji Picker Popover */}
      {showPicker && (
        <div
          className={`absolute -top-11 z-20 flex items-center gap-1.5 bg-white dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-full p-1.5 shadow-xl animate-fade-in ${
            isOutgoing ? 'right-2' : 'left-2'
          }`}
        >
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="text-lg hover:scale-125 transition active:scale-95 px-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`relative max-w-[85%] md:max-w-[70%] p-2.5 px-3.5 shadow-xs text-sm transition-all ${
          isOutgoing
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-xs border border-[#c4f3bd] dark:border-[#0b6b59]'
            : 'bg-white dark:bg-obsidian-card text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tl-xs border border-zinc-200/80 dark:border-obsidian-border'
        }`}
      >
        {/* Sender name for group chats */}
        {isGroup && !isOutgoing && message.sender_name && (
          <p className="text-[11px] font-semibold text-mint-600 dark:text-mint-400 mb-1">
            {message.sender_name}
          </p>
        )}

        {/* Quoted Reply Preview */}
        {message.reply_to && (
          <div
            className={`border-l-3 border-mint-500 pl-2 py-1 mb-2 rounded-r-lg text-xs ${
              isOutgoing
                ? 'bg-black/5 dark:bg-black/20 text-zinc-800 dark:text-zinc-200'
                : 'bg-zinc-100 dark:bg-obsidian-surface text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <p className="font-semibold text-mint-600 dark:text-mint-400 text-[11px]">
              {message.reply_to.sender_name}
            </p>
            <p className="truncate text-[11px] opacity-80">
              {message.reply_to.content || '[Attachment]'}
            </p>
          </div>
        )}

        {/* IMAGE */}
        {message.type === 'IMAGE' && message.media_url && (
          <div
            onClick={() =>
              setLightboxMedia({
                url: fullMediaUrl,
                type: 'IMAGE',
                name: message.media_name || 'Image',
              })
            }
            className="cursor-pointer overflow-hidden rounded-xl mb-1.5 group relative"
          >
            <img
              src={fullMediaUrl}
              alt={message.media_name || 'Attached photo'}
              className="max-h-72 w-full object-cover rounded-xl transition duration-200 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        )}

        {/* VIDEO */}
        {message.type === 'VIDEO' && message.media_url && (
          <div className="overflow-hidden rounded-xl mb-1.5 max-h-72 bg-black flex items-center justify-center">
            <video src={fullMediaUrl} controls className="max-h-72 w-full rounded-xl" />
          </div>
        )}

        {/* DOCUMENT */}
        {message.type === 'DOCUMENT' && message.media_url && (
          <a
            href={fullMediaUrl}
            download={message.media_name || 'document'}
            className={`flex items-center gap-3 p-2.5 rounded-xl mb-1 transition ${
              isOutgoing
                ? 'bg-black/5 dark:bg-black/20 hover:bg-black/10 text-inherit'
                : 'bg-zinc-50 dark:bg-obsidian-surface hover:bg-zinc-100 text-inherit'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-mint-500/20 text-mint-600 dark:text-mint-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-current" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold truncate">
                {message.media_name || 'Attached file'}
              </p>
              <p className="text-[10px] opacity-75">{formatSize(message.media_size)}</p>
            </div>
            <Download className="w-4 h-4 flex-shrink-0 opacity-70 hover:opacity-100" />
          </a>
        )}

        {/* TEXT CONTENT */}
        {message.content && (
          <p className="whitespace-pre-wrap break-words leading-relaxed select-text font-normal">
            {message.content}
          </p>
        )}

        {/* Bottom meta: Time & Delivery Status */}
        <div
          className={`flex items-center justify-end gap-1 text-[10px] mt-1 select-none font-medium ${
            isOutgoing
              ? 'text-zinc-600 dark:text-zinc-300'
              : 'text-zinc-400 dark:text-zinc-500'
          }`}
        >
          <span>{timeStr}</span>
          {isOutgoing && (
            <DeliveryTicks
              status={message.delivery_status}
              className={
                message.delivery_status === 'READ'
                  ? 'text-sky-500 dark:text-sky-400'
                  : 'text-zinc-400 dark:text-zinc-400'
              }
            />
          )}
        </div>
      </div>

      {/* Emoji Reactions Pill Under Bubble */}
      {reactionEntries.length > 0 && (
        <div
          className={`flex items-center gap-1 mt-0.5 -translate-y-1 ${
            isOutgoing ? 'mr-1' : 'ml-1'
          }`}
        >
          {reactionEntries.map(([emoji, users]) => (
            <span
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-white dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-full shadow-xs cursor-pointer hover:scale-110 transition"
            >
              <span>{emoji}</span>
              {users.length > 1 && <span className="font-semibold text-zinc-500 text-[10px]">{users.length}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
