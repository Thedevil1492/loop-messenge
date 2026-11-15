import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { Users, X, Check, Search } from 'lucide-react';
import type { User } from '../../types.js';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setActiveChatId = useStore((state) => state.setActiveChatId);
  const setChats = useStore((state) => state.setChats);

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    async function loadContacts() {
      setLoading(true);
      try {
        const list = await api.searchUsers(search);
        if (isCurrent) setUsers(list);
      } catch (err) {
        console.error(err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }
    loadContacts();
    return () => {
      isCurrent = false;
    };
  }, [isOpen, search]);

  if (!isOpen) return null;

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name');
      return;
    }
    if (selectedIds.length === 0) {
      setError('Please select at least one contact to add to the group');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { chatId } = await api.createGroupChat(name.trim(), selectedIds, description.trim());
      // Refresh chat list immediately so the new group appears right away!
      const updatedChats = await api.getChats();
      setChats(updatedChats);
      setActiveChatId(chatId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-obsidian-card border border-zinc-200 dark:border-obsidian-border rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-obsidian-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-mint-500" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Create New Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-obsidian-surface text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2.5 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-3 border-b border-zinc-100 dark:border-obsidian-border">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Design Sync or Family Chat"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Group purpose or guidelines"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
              />
            </div>
          </div>

          {/* Member Selection List */}
          <div className="p-3 border-b border-zinc-100 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface/50">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
              <span>Add Members ({selectedIds.length} selected)</span>
            </div>
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-obsidian-card border border-zinc-200 dark:border-obsidian-border text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-obsidian-border/50">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-zinc-400">
                <span className="w-5 h-5 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center p-6 text-xs text-zinc-400">No contacts found</div>
            ) : (
              users.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleMember(u.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-obsidian-surface cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {u.display_name}
                        </p>
                        <p className="text-[10px] text-mint-600 dark:text-mint-400 truncate">
                          {u.username || u.anon_tag || u.email}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-mint-500 border-mint-500 text-white'
                          : 'border-zinc-300 dark:border-obsidian-border'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Submit Button */}
          <div className="p-3 border-t border-zinc-100 dark:border-obsidian-border bg-white dark:bg-obsidian-card flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || selectedIds.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-mint-500 hover:bg-mint-600 rounded-xl transition shadow-md shadow-mint-500/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating Group...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
