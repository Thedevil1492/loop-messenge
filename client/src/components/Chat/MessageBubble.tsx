import React from 'react';
import type { Message } from '../../types.js';
import { useStore } from '../../store/useStore.js';
import { DeliveryTicks } from '../UI/DeliveryTicks.js';
import { getMediaUrl } from '../../services/api.js';
import { FileText, Download, Play } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isGroup: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isGroup }) => {
  const currentUser = useStore((state) => state.currentUser);
  const setLightboxMedia = useStore((state) => state.setLightboxMedia);

  const isOutgoing = message.sender_id === currentUser?.id;
  const timeStr = format(new Date(message.created_at), 'p');
  const fullMediaUrl = getMediaUrl(message.media_url);

  // Format file size
  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`flex flex-col mb-1.5 ${isOutgoing ? 'items-end' : 'items-start'}`}>
      <div
        className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-2.5 px-3.5 shadow-sm text-sm transition-all ${
          isOutgoing
            ? 'bg-gradient-to-r from-loop-600 to-loop-700 text-white rounded-br-xs shadow-loop-600/10'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-100 dark:border-slate-700/60'
        }`}
      >
        {/* Sender name for group chats */}
        {isGroup && !isOutgoing && message.sender_name && (
          <p className="text-[11px] font-bold text-loop-600 dark:text-cyanAccent-400 mb-1">
            {message.sender_name}
          </p>
        )}

        {/* IMAGE */}
        {message.type === 'IMAGE' && message.media_url && (
          <div
            onClick={() => setLightboxMedia({ url: fullMediaUrl, type: 'IMAGE', name: message.media_name || 'Image' })}
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
            <video
              src={fullMediaUrl}
              controls
              className="max-h-72 w-full rounded-xl"
            />
          </div>
        )}

        {/* DOCUMENT */}
        {message.type === 'DOCUMENT' && message.media_url && (
          <a
            href={fullMediaUrl}
            download={message.media_name || 'document'}
            className={`flex items-center gap-3 p-2.5 rounded-xl mb-1 transition ${
              isOutgoing
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-loop-500/20 text-loop-500 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-current" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold truncate">{message.media_name || 'Attached file'}</p>
              <p className="text-[10px] opacity-75">{formatSize(message.media_size)}</p>
            </div>
            <Download className="w-4 h-4 flex-shrink-0 opacity-70 hover:opacity-100" />
          </a>
        )}

        {/* TEXT CONTENT */}
        {message.content && (
          <p className="whitespace-pre-wrap break-words leading-relaxed select-text">
            {message.content}
          </p>
        )}

        {/* Bottom meta: Time & Delivery Status */}
        <div
          className={`flex items-center justify-end gap-1 text-[10px] mt-1 select-none ${
            isOutgoing ? 'text-white/70' : 'text-slate-400 dark:text-slate-400'
          }`}
        >
          <span>{timeStr}</span>
          {isOutgoing && (
            <DeliveryTicks
              status={message.delivery_status}
              className={message.delivery_status === 'READ' ? 'text-cyan-300' : 'text-white/70'}
            />
          )}
        </div>
      </div>
    </div>
  );
};
