import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { Search, X, UserPlus, MessageSquare, ShieldCheck } from 'lucide-react';
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
  const setChats = useStore((state) => state.setChats);
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
      const updatedChats = await api.getChats();
      setChats(updatedChats);
      setActiveChatId(chatId);
      onClose();
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-obsidian-card border border-zinc-200 dark:border-obsidian-border rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-obsidian-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-mint-500" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Start New Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-obsidian-surface text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-zinc-100 dark:border-obsidian-border">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or @anon_tag..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-zinc-100 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500 border border-transparent focus:border-zinc-300 dark:focus:border-obsidian-border"
              autoFocus
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-obsidian-border/50">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-zinc-400">
              <span className="w-5 h-5 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-8 text-xs text-zinc-400 dark:text-zinc-500">
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
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-obsidian-surface transition text-left group cursor-pointer"
                >
                  <Avatar src={u.avatar_url} name={u.display_name} isOnline={isOnline} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {u.display_name}
                      </p>
                      <span className="text-[11px] text-mint-600 dark:text-mint-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 font-semibold">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </span>
                    </div>
                    <p className="text-xs text-mint-600 dark:text-mint-400 font-medium truncate">
                      {u.anon_tag || u.email}
                    </p>
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
