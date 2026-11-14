import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { Users, X, Check } from 'lucide-react';
import type { User } from '../../types.js';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const setActiveChatId = useStore((state) => state.setActiveChatId);

  useEffect(() => {
    if (!isOpen) return;
    async function loadContacts() {
      setLoading(true);
      try {
        const list = await api.searchUsers('');
        setUsers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadContacts();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (selectedIds.length === 0) {
      alert('Please select at least one contact to add to the group');
      return;
    }

    setSubmitting(true);
    try {
      const { chatId } = await api.createGroupChat(name, selectedIds, description);
      setActiveChatId(chatId);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-loop-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Create Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Project Loop Team"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-loop-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this group about?"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-loop-500"
              />
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Select Participants</span>
            <span className="font-semibold text-loop-600 dark:text-loop-400">
              {selectedIds.length} selected
            </span>
          </div>

          {/* Member picker list */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-slate-400">
                <span className="w-5 h-5 border-2 border-loop-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center p-8 text-xs text-slate-400">No contacts available</div>
            ) : (
              users.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleMember(u.id)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
                      <div className="truncate">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {u.display_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-loop-600 border-loop-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Submit */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting || !name.trim() || selectedIds.length === 0}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-loop-600 to-cyanAccent-500 hover:opacity-95 shadow-md shadow-loop-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
