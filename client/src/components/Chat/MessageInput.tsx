import React, { useState, useRef } from 'react';
import { useStore } from '../../store/useStore.js';
import { api } from '../../services/api.js';
import { socket } from '../../services/socket.js';
import { Paperclip, Send, X, Loader2 } from 'lucide-react';

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
    });

    setContent('');
    setPendingMedia(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 md:p-4 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md">
      {/* Pending Media Preview Banner */}
      {pendingMedia && (
        <div className="mb-2.5 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between border border-slate-200 dark:border-slate-700 animate-slide-up">
          <div className="flex items-center gap-2.5 min-w-0">
            {pendingMedia.mediaType === 'IMAGE' ? (
              <img
                src={pendingMedia.url}
                alt="Preview"
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-loop-500/20 text-loop-500 flex items-center justify-center font-bold text-xs uppercase">
                {pendingMedia.name.split('.').pop() || 'FILE'}
              </div>
            )}
            <div className="truncate text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {pendingMedia.name}
              </p>
              <p className="text-[10px] text-slate-400">Ready to send</p>
            </div>
          </div>
          <button
            onClick={() => setPendingMedia(null)}
            className="p-1 rounded-full text-slate-400 hover:text-rose-500 transition"
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
          className="p-2.5 rounded-full text-slate-400 hover:text-loop-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
          title="Attach photo, video or document"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-loop-500" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        {/* Text Input */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-3.5 py-2 flex items-center border border-transparent focus-within:border-loop-500 transition">
          <textarea
            rows={1}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-transparent resize-none text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none max-h-32"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() && !pendingMedia}
          className="p-2.5 rounded-full bg-gradient-to-tr from-loop-600 to-cyanAccent-500 text-white shadow-md shadow-loop-500/30 hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
          title="Send message (Enter)"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
