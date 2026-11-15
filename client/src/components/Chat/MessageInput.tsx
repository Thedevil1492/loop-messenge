import React, { useState, useRef } from 'react';
import { useStore } from '../../store/useStore.js';
import { api } from '../../services/api.js';
import { socket } from '../../services/socket.js';
import { Paperclip, Send, X, Loader2, Mic, Smile, Image as ImageIcon } from 'lucide-react';

export const MessageInput: React.FC = () => {
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    url: string;
    name: string;
    size: number;
    mimeType: string;
    mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  } | null>(null);

  const activeChatId = useStore((state) => state.activeChatId);
  const addMessage = useStore((state) => state.addMessage);
  const currentUser = useStore((state) => state.currentUser);
  const replyingToMessage = useStore((state) => state.replyingToMessage);
  const setReplyingTo = useStore((state) => state.setReplyingTo);

  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeChatId) return null;

  const handleTyping = () => {
    // Notify server of typing
    socket.send('typing:update', { chatId: activeChatId, isTyping: true });

    // Reset debounce timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      socket.send('typing:update', { chatId: activeChatId, isTyping: false });
    }, 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const media = await api.uploadFile(file);
      setPendingMedia(media);
    } catch (err: any) {
      alert(err.message || 'Failed to upload media');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    const text = content.trim();
    if (!text && !pendingMedia) return;

    // Clear typing state
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.send('typing:update', { chatId: activeChatId, isTyping: false });

    const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();

    // Prepare reply_to payload if replying
    const replyPayload = replyingToMessage
      ? {
          id: replyingToMessage.id,
          sender_name: replyingToMessage.sender_name,
          content: replyingToMessage.content,
        }
      : undefined;

    // Optimistically add to UI
    const optimisticMessage = {
      id: clientMsgId,
      clientMessageId: clientMsgId,
      chat_id: activeChatId,
      sender_id: currentUser!.id,
      sender_name: currentUser!.display_name,
      sender_avatar: currentUser!.avatar_url,
      type: pendingMedia ? pendingMedia.mediaType : ('TEXT' as const),
      content: text,
      media_url: pendingMedia?.url || null,
      media_mime_type: pendingMedia?.mimeType || null,
      media_size: pendingMedia?.size || null,
      media_name: pendingMedia?.name || null,
      reply_to: replyPayload,
      is_deleted: 0,
      created_at: now,
      updated_at: now,
      delivery_status: 'SENT' as const,
    };

    addMessage(activeChatId, optimisticMessage);

    // Send over WebSocket
    socket.send('message:send', {
      clientMessageId: clientMsgId,
      chatId: activeChatId,
      content: text,
      type: pendingMedia ? pendingMedia.mediaType : 'TEXT',
      mediaUrl: pendingMedia?.url,
      mediaMimeType: pendingMedia?.mimeType,
      mediaSize: pendingMedia?.size,
      mediaName: pendingMedia?.name,
      replyTo: replyPayload,
    });

    setContent('');
    setPendingMedia(null);
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = content.trim().length > 0 || pendingMedia !== null;

  return (
    <div className="p-2 md:p-3 bg-white/95 dark:bg-obsidian-card/95 border-t border-zinc-200 dark:border-obsidian-border backdrop-blur-md transition-colors">
      {/* Quoted Reply Preview Dock */}
      {replyingToMessage && (
        <div className="mb-2 p-2 px-3 rounded-xl bg-zinc-100 dark:bg-obsidian-surface border-l-4 border-mint-500 flex items-center justify-between animate-slide-up">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-semibold text-mint-600 dark:text-mint-400">
              Replying to {replyingToMessage.sender_name}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
              {replyingToMessage.content || '[Attachment]'}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-zinc-200 dark:hover:bg-obsidian-card transition"
            title="Cancel Reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Media Preview Banner */}
      {pendingMedia && (
        <div className="mb-2.5 p-2 rounded-2xl bg-zinc-100 dark:bg-obsidian-surface flex items-center justify-between border border-zinc-200 dark:border-obsidian-border animate-slide-up">
          <div className="flex items-center gap-2.5 min-w-0">
            {pendingMedia.mediaType === 'IMAGE' ? (
              <img
                src={pendingMedia.url}
                alt="Preview"
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-mint-500/20 text-mint-600 dark:text-mint-400 flex items-center justify-center font-bold text-xs uppercase">
                {pendingMedia.name.split('.').pop() || 'FILE'}
              </div>
            )}
            <div className="truncate text-xs">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {pendingMedia.name}
              </p>
              <p className="text-[10px] text-zinc-400">Ready to send</p>
            </div>
          </div>
          <button
            onClick={() => setPendingMedia(null)}
            className="p-1 rounded-full text-zinc-400 hover:text-rose-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input controls */}
      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,application/*,text/*"
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2.5 rounded-full text-zinc-400 hover:text-mint-600 dark:hover:text-mint-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition disabled:opacity-50"
          title="Attach photo, video or document"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-mint-500" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        {/* Text Input Container */}
        <div className="flex-1 bg-zinc-100 dark:bg-obsidian-surface rounded-2xl px-3.5 py-2 flex items-center border border-zinc-200/80 dark:border-obsidian-border focus-within:border-mint-500 dark:focus-within:border-mint-500 transition">
          <textarea
            rows={1}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-transparent resize-none text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none max-h-32 leading-relaxed"
          />
        </div>

        {/* Morphing Send / Mic Button */}
        {hasContent ? (
          <button
            type="button"
            onClick={handleSend}
            className="p-2.5 rounded-full bg-mint-500 hover:bg-mint-600 active:scale-95 text-white shadow-md shadow-mint-500/25 transition flex items-center justify-center cursor-pointer"
            title="Send message (Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => alert('Hold to record voice notes is coming in the next audio update!')}
            className="p-2.5 rounded-full text-zinc-400 hover:text-mint-600 dark:hover:text-mint-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition"
            title="Voice message"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
