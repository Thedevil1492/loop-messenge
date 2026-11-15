import React, { useState, useEffect } from 'react';
import { api, BASE_URL } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import {
  ShieldCheck,
  X,
  Users,
  MessageSquare,
  Trash2,
  UserPlus,
  LogIn,
  Key,
  Lock,
  RefreshCw,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import type { User } from '../../types.js';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Admin Data
  const [stats, setStats] = useState<{ totalUsers: number; totalChats: number; totalMessages: number } | null>(null);
  const [userList, setUserList] = useState<User[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Create User Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  const setAuth = useStore((state) => state.setAuth);

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid passcode');

      setIsUnlocked(true);
      sessionStorage.setItem('loop_admin_secret', passcode);
      await loadAdminData(passcode);
    } catch (err: any) {
      setError(err.message || 'Incorrect passcode');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async (secret?: string) => {
    const key = secret || sessionStorage.getItem('loop_admin_secret') || passcode;
    if (!key) return;

    setLoading(true);
    try {
      // 1. Stats
      const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': key,
        },
      });
      const statsData = await statsRes.json();
      if (statsData.stats) setStats(statsData.stats);

      // 2. Users
      const usersRes = await fetch(`${BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': key,
        },
      });
      const usersData = await usersRes.json();
      if (usersData.users) setUserList(usersData.users);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? All their messages and chats will be deleted.`)) {
      return;
    }

    const key = sessionStorage.getItem('loop_admin_secret') || passcode;
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': key,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      setUserList((prev) => prev.filter((u) => u.id !== userId));
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleLoginAsUser = async (userId: string) => {
    const key = sessionStorage.getItem('loop_admin_secret') || passcode;
    try {
      const res = await fetch(`${BASE_URL}/api/admin/login-as`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': key,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to switch user');

      setAuth(data.user, data.token);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to switch user');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim() || !newUsername.trim() || !newPassword.trim()) {
      alert('Please fill display name, username, and password');
      return;
    }

    const key = sessionStorage.getItem('loop_admin_secret') || passcode;
    setCreating(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': key,
        },
        body: JSON.stringify({
          displayName: newDisplayName.trim(),
          username: newUsername.trim(),
          password: newPassword.trim(),
          email: newEmail.trim() || undefined,
          isAdmin: newIsAdmin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      alert(`Account @${data.user.username} created successfully!`);
      setNewDisplayName('');
      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      setNewIsAdmin(false);
      setShowCreateForm(false);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = userList.filter((u) => {
    const q = searchFilter.toLowerCase();
    return (
      u.display_name.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 select-none animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-obsidian-card border border-zinc-200 dark:border-obsidian-border rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-obsidian-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Loop Master Admin Console
              </h2>
              <p className="text-[11px] text-zinc-500">Superuser privileges & account manager</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-obsidian-surface text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCREEN 1: PASSCODE LOCK */}
        {!isUnlocked ? (
          <div className="p-8 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Restricted Admin Access
            </h3>
            <p className="text-xs text-zinc-500 mb-5">
              Enter your secret Master Passcode to unlock user management and platform controls.
            </p>

            {error && (
              <div className="w-full p-2.5 mb-4 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900/50">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyPasscode} className="w-full space-y-3">
              <input
                type="password"
                required
                autoFocus
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter Admin Master Passcode..."
                className="w-full px-4 py-2.5 text-center tracking-widest text-sm rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500"
              />

              <button
                type="submit"
                disabled={loading || !passcode}
                className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Unlock Admin Panel'}
              </button>
            </form>
          </div>
        ) : (
          /* SCREEN 2: UNLOCKED ADMIN DASHBOARD */
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Live Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200/80 dark:border-obsidian-border text-center">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase">Total Users</p>
                  <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200/80 dark:border-obsidian-border text-center">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase">Total Chats</p>
                  <p className="text-xl font-extrabold text-mint-600 dark:text-mint-400 mt-0.5">
                    {stats.totalChats}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200/80 dark:border-obsidian-border text-center">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase">Messages</p>
                  <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                    {stats.totalMessages}
                  </p>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter users by name or @username..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-rose-500"
              />

              <button
                type="button"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="py-2 px-3.5 rounded-xl bg-mint-500 hover:bg-mint-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{showCreateForm ? 'Close Form' : 'Create User'}</span>
              </button>

              <button
                type="button"
                onClick={() => loadAdminData()}
                className="p-2 rounded-xl bg-zinc-100 dark:bg-obsidian-surface hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Create User Form Box */}
            {showCreateForm && (
              <form onSubmit={handleCreateUser} className="p-4 rounded-2xl bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border space-y-3 animate-slide-up">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Create New Account (Admin Bypass)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Display Name (e.g. Master Admin)"
                    className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-white dark:bg-obsidian-card text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-mint-500"
                  />
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Unique @username (e.g. admin)"
                    className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-white dark:bg-obsidian-card text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-mint-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-white dark:bg-obsidian-card text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-mint-500"
                  />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email (Optional)"
                    className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-white dark:bg-obsidian-card text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-mint-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsAdmin}
                      onChange={(e) => setNewIsAdmin(e.target.checked)}
                      className="rounded text-rose-500 focus:ring-rose-500"
                    />
                    <span>Make Stealth Admin (Invisible in search until admin messages)</span>
                  </label>

                  <button
                    type="submit"
                    disabled={creating}
                    className="py-2 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                  >
                    {creating ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}

            {/* Registered Users List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider px-1">
                Registered Accounts ({filteredUsers.length})
              </h3>

              {loading ? (
                <div className="flex items-center justify-center p-8 text-zinc-400">
                  <span className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-obsidian-surface rounded-2xl">
                  No accounts found
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200/80 dark:border-obsidian-border flex items-center justify-between hover:border-zinc-300 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={u.avatar_url} name={u.display_name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {u.display_name}
                          </p>
                          {u.is_admin === 1 && (
                            <span className="px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-500 text-[10px] font-bold border border-rose-500/20">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-mint-600 dark:text-mint-400 font-medium truncate">
                          @{u.username || u.anon_tag || 'user'}
                          {u.email && <span className="text-zinc-400 ml-1.5 font-normal">({u.email})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoginAsUser(u.id)}
                        className="p-2 rounded-xl bg-mint-500/10 hover:bg-mint-500/20 text-mint-600 dark:text-mint-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Login as this user"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Login As</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.display_name)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                        title="Delete account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
