import React, { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore.js';
import { api } from '../../services/api.js';
import { socket } from '../../services/socket.js';
import { MessageBubble } from './MessageBubble.js';
import { TypingIndicator } from './TypingIndicator.js';
import { format, isToday, isYesterday } from 'date-fns';

export const MessageList: React.FC = () => {
  const activeChatId = useStore((state) => state.activeChatId);
  const messagesMap = useStore((state) => state.messages);
  const setMessages = useStore((state) => state.setMessages);
  const clearUnread = useStore((state) => state.clearUnread);
  const chats = useStore((state) => state.chats);
  const currentUser = useStore((state) => state.currentUser);
  const typing = useStore((state) => state.typing);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chat = chats.find((c) => c.id === activeChatId);
  const messages = activeChatId ? messagesMap[activeChatId] || [] : [];

  // Fetch messages and clear unread when activeChatId changes
  useEffect(() => {
    if (!activeChatId) return;

    let isCurrent = true;
    async function loadMessages() {
      try {
        const history = await api.getMessages(activeChatId!);
        if (isCurrent) {
          setMessages(activeChatId!, history);
          clearUnread(activeChatId!);

          // Send read receipt to server
          await api.markAsRead(activeChatId!);

          // Also notify over WebSocket for any incoming messages
          const unreadIncoming = history.filter(
            (m) => m.sender_id !== currentUser?.id && m.delivery_status !== 'READ'
          );
          for (const m of unreadIncoming) {
            socket.send('message:receipt', {
              messageId: m.id,
              chatId: activeChatId,
              status: 'READ',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }

    loadMessages();
    return () => {
      isCurrent = false;
    };
  }, [activeChatId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!activeChatId || !chat) return null;

  // Check if someone else is typing in this chat
  const chatTypers = typing[activeChatId];
  const isPeerTyping =
    chatTypers && Object.keys(chatTypers).some((uid) => uid !== currentUser?.id && chatTypers[uid]);

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Group messages by date
  let lastDateStr = '';

  return (
    <div className="flex-1 overflow-y-auto p-4 md:px-6 space-y-2">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
          <div className="w-14 h-14 rounded-2xl bg-loop-50 dark:bg-slate-800/80 flex items-center justify-center text-loop-500 mb-2">
            👋
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Start the conversation
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Send a message, image, video or document to get looping!
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const msgDate = new Date(msg.created_at);
          const dateStr = formatDateHeader(msgDate);
          const showDateHeader = dateStr !== lastDateStr;
          lastDateStr = dateStr;

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && (
                <div className="flex items-center justify-center my-4 select-none">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 shadow-xs">
                    {dateStr}
                  </span>
                </div>
              )}
              <MessageBubble message={msg} isGroup={chat.type === 'GROUP'} />
            </React.Fragment>
          );
        })
      )}

      {isPeerTyping && (
        <div className="mt-2">
          <TypingIndicator />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
