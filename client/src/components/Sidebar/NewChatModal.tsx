import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import {
  Search,
  X,
  UserPlus,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Clock,
  Check,
  Lock,
  Inbox,
} from 'lucide-react';
import type { SearchContactUser, ContactRequestItem } from '../../types.js';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'REQUESTS'>('SEARCH');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<SearchContactUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ContactRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const setActiveChatId = useStore((state) => state.setActiveChatId);
  const setChats = useStore((state) => state.setChats);
  const presence = useStore((state) => state.presence);

  // Fetch incoming contact requests
  const loadPendingRequests = async () => {
    setRequestsLoading(true);
    try {
      const list = await api.getPendingRequests();
      setPendingRequests(list);
    } catch (err) {
      console.error('Failed to load contact requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadPendingRequests();
  }, [isOpen]);

  // Search users only when user types at least 2 characters
  useEffect(() => {
    if (!isOpen || activeTab !== 'SEARCH') return;

    if (!search.trim() || search.trim().length < 2) {
      setUsers([]);
      setLoading(false);
      return;
    }

    let isCurrent = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await api.searchUsers(search.trim());
        if (isCurrent) setUsers(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [isOpen, search, activeTab]);

  if (!isOpen) return null;

  // 1. Direct message start (if connected)
  const handleOpenChat = async (targetUserId: string, existingChatId?: string) => {
    try {
      if (existingChatId) {
        setActiveChatId(existingChatId);
        onClose();
        return;
      }
      const { chatId } = await api.createDirectChat(targetUserId);
      const updatedChats = await api.getChats();
      setChats(updatedChats);
      setActiveChatId(chatId);
      onClose();
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  // 2. Send Friend/Contact Request (+ Add)
  const handleSendRequest = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    try {
      const res = await api.sendContactRequest(targetUserId);
      // Update UI state to REQUEST_SENT
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, relationship: 'REQUEST_SENT', requestId: res.requestId } : u
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Respond to Contact Request (Accept / Decline)
  const handleRespondRequest = async (requestId: string, action: 'ACCEPT' | 'DECLINE') => {
    setActionLoadingId(requestId);
    try {
      const res = await api.respondContactRequest(requestId, action);

      if (action === 'ACCEPT' && res.chatId) {
        const updatedChats = await api.getChats();
        setChats(updatedChats);
        setActiveChatId(res.chatId);
        onClose();
        return;
      }

      // Remove from pending list
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      // Refresh search results if relevant
      if (search.trim()) {
        const updated = await api.searchUsers(search.trim());
        setUsers(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to respond to request');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-obsidian-card border border-zinc-200 dark:border-obsidian-border rounded-3xl shadow-2xl flex flex-col max-h-[82vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-obsidian-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-mint-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Add & Connect</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-obsidian-surface text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Search vs Requests */}
        <div className="flex items-center p-2 border-b border-zinc-100 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface/60">
          <button
            type="button"
            onClick={() => setActiveTab('SEARCH')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'SEARCH'
                ? 'bg-white dark:bg-obsidian-card text-mint-600 dark:text-mint-400 shadow-xs border border-zinc-200/80 dark:border-obsidian-border'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search @username</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer relative ${
              activeTab === 'REQUESTS'
                ? 'bg-white dark:bg-obsidian-card text-mint-600 dark:text-mint-400 shadow-xs border border-zinc-200/80 dark:border-obsidian-border'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Friend Requests</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-mint-500 text-white text-[10px] font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: SEARCH USERNAME */}
        {activeTab === 'SEARCH' && (
          <>
            {/* Search Input Box */}
            <div className="p-3 border-b border-zinc-100 dark:border-obsidian-border">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Enter @username to find friends..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500 border border-transparent focus:border-zinc-300 dark:focus:border-obsidian-border font-medium"
                  autoFocus
                />
              </div>
            </div>

            {/* Search Results Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center p-10 text-zinc-400">
                  <span className="w-5 h-5 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !search.trim() || search.trim().length < 2 ? (
                /* Friendly Search Placeholder */
                <div className="p-8 text-center flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <div className="w-12 h-12 rounded-2xl bg-mint-500/10 text-mint-500 flex items-center justify-center mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    Find & Connect With Friends
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
                    Type a friend's <strong>@username</strong> above to send a request and start chatting!
                  </p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center p-8 text-xs text-zinc-400 dark:text-zinc-500">
                  No user found with username <span className="font-semibold text-zinc-600 dark:text-zinc-300">"{search}"</span>
                </div>
              ) : (
                users.map((u) => {
                  const userPresence = presence[u.id];
                  const isOnline = userPresence ? userPresence.isOnline : !!u.is_online;
                  const isActionLoading = actionLoadingId === u.id || actionLoadingId === u.requestId;

                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/70 dark:bg-obsidian-surface border border-zinc-200/60 dark:border-obsidian-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={u.avatar_url} name={u.display_name} isOnline={isOnline} size="md" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {u.display_name}
                          </p>
                          <p className="text-[11px] text-mint-600 dark:text-mint-400 font-medium truncate">
                            {u.username ? (u.username.startsWith('@') ? u.username : `@${u.username}`) : (u.anon_tag || '@user')}
                          </p>
                        </div>
                      </div>

                      {/* Action Button based on Relationship */}
                      <div>
                        {u.relationship === 'CONNECTED' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenChat(u.id, u.chatId)}
                            className="py-1.5 px-3 rounded-xl bg-mint-500/10 hover:bg-mint-500/20 text-mint-600 dark:text-mint-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        ) : u.relationship === 'REQUEST_SENT' ? (
                          <span className="py-1.5 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-xs font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </span>
                        ) : u.relationship === 'REQUEST_RECEIVED' ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => u.requestId && handleRespondRequest(u.requestId, 'ACCEPT')}
                            className="py-1.5 px-3.5 rounded-xl bg-mint-500 hover:bg-mint-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Accept</span>
                          </button>
                        ) : (
                          /* Relationship is NONE - Show + Add Button */
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleSendRequest(u.id)}
                            className="py-1.5 px-3.5 rounded-xl bg-mint-500 hover:bg-mint-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-mint-500/20 transition cursor-pointer disabled:opacity-50"
                          >
                            {isActionLoading ? (
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>+ Add</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* TAB 2: PENDING FRIEND REQUESTS */}
        {activeTab === 'REQUESTS' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {requestsLoading ? (
              <div className="flex items-center justify-center p-10 text-zinc-400">
                <span className="w-5 h-5 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-zinc-400">
                <Inbox className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Pending Requests</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  When someone adds you by your @username, their request will appear here.
                </p>
              </div>
            ) : (
              pendingRequests.map((req) => {
                const isActionLoading = actionLoadingId === req.id;

                return (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200/70 dark:border-obsidian-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={req.avatar_url} name={req.display_name} size="md" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {req.display_name}
                        </p>
                        <p className="text-[11px] text-mint-600 dark:text-mint-400 font-semibold truncate">
                          {req.username ? (req.username.startsWith('@') ? req.username : `@${req.username}`) : (req.anon_tag || '@user')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleRespondRequest(req.id, 'DECLINE')}
                        className="py-1.5 px-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer"
                      >
                        Decline
                      </button>

                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleRespondRequest(req.id, 'ACCEPT')}
                        className="py-1.5 px-3.5 rounded-xl bg-mint-500 hover:bg-mint-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer disabled:opacity-50"
                      >
                        {isActionLoading ? (
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
