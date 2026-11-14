import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { Search, X, UserPlus, MessageSquare } from 'lucide-react';
import type { User } from '../../types.js';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const setActiveChatId = useStore((state) => state.setActiveChatId);
  const presence = useStore((state) => state.presence);

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;

    async function fetchUsers() {
      setLoading(true);
      try {
        const results = await api.searchUsers(search);
        if (isCurrent) setUsers(results);
      } catch (err) {
        console.error(err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    const timer = setTimeout(fetchUsers, 200);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [isOpen, search]);

  if (!isOpen) return null;

  const handleStartChat = async (userId: string) => {
    try {
      const { chatId } = await api.createDirectChat(userId);
      setActiveChatId(chatId);
      onClose();
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-loop-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Start New Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-loop-500"
              autoFocus
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-slate-400">
              <span className="w-5 h-5 border-2 border-loop-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-8 text-xs text-slate-400 dark:text-slate-500">
              No contacts found
            </div>
          ) : (
            users.map((u) => {
              const userPresence = presence[u.id];
              const isOnline = userPresence ? userPresence.isOnline : !!u.is_online;

              return (
                <button
                  key={u.id}
                  onClick={() => handleStartChat(u.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition text-left group"
                >
                  <Avatar src={u.avatar_url} name={u.display_name} isOnline={isOnline} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {u.display_name}
                      </p>
                      <span className="text-[11px] text-loop-600 dark:text-loop-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 font-medium">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
