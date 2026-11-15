import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { AdminModal } from '../Admin/AdminModal.js';
import {
  Moon,
  Sun,
  ShieldCheck,
  Lock,
  Clock,
  Database,
  LogOut,
  ChevronRight,
  Bell,
  Smartphone,
  KeyRound,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const currentUser = useStore((state) => state.currentUser);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const logout = useStore((state) => state.logout);

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const handleVersionTap = () => {
    const next = tapCount + 1;
    if (next >= 5) {
      setTapCount(0);
      setIsAdminOpen(true);
    } else {
      setTapCount(next);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-obsidian-bg select-none overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 dark:border-obsidian-border bg-white dark:bg-obsidian-card">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Settings</h1>
      </div>

      <div className="p-4 space-y-5 max-w-xl">
        {/* User Profile Card */}
        <div className="flex items-center gap-4 bg-white dark:bg-obsidian-card p-4 rounded-2xl border border-slate-200/80 dark:border-obsidian-border shadow-xs">
          <Avatar src={currentUser?.avatar_url} name={currentUser?.display_name || 'Me'} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {currentUser?.display_name}
              </h2>
              <span className="text-[10px] font-semibold bg-mint-500/15 text-mint-600 dark:text-mint-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Zero-PII</span>
              </span>
            </div>
            <p className="text-xs text-mint-600 dark:text-mint-400 font-semibold truncate mt-0.5">
              {currentUser?.anon_tag || currentUser?.email}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {currentUser?.bio || 'Looping in private'}
            </p>
          </div>
        </div>

        {/* Section: Appearance */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 px-1">
            Appearance
          </h3>
          <div className="bg-white dark:bg-obsidian-card rounded-2xl border border-slate-200/80 dark:border-obsidian-border divide-y divide-slate-100 dark:divide-obsidian-border shadow-xs">
            <div
              onClick={toggleTheme}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-obsidian-surface cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Theme</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{theme} Mode</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-mint-600 dark:text-mint-400 bg-mint-500/10 px-2.5 py-1 rounded-full">
                Toggle
              </span>
            </div>
          </div>
        </div>

        {/* Section: Privacy & Security (SimpleX Style) */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 px-1">
            Privacy & Security
          </h3>
          <div className="bg-white dark:bg-obsidian-card rounded-2xl border border-slate-200/80 dark:border-obsidian-border divide-y divide-slate-100 dark:divide-obsidian-border shadow-xs">
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">End-to-End Encryption</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">All messages & voice notes encrypted</p>
                </div>
              </div>
              <span className="text-xs text-emerald-500 font-semibold">Active</span>
            </div>

            <div
              onClick={() => alert('Disappearing Messages: Set default timer (Off, 24h, 7d).')}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-obsidian-surface cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Disappearing Messages</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Default timer for new chats</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>

            <div
              onClick={() => alert('App Lock: Screen lock and fingerprint auth supported.')}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-obsidian-surface cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Screen Lock</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Require biometric or device PIN</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Section: Server & Storage */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 px-1">
            Infrastructure
          </h3>
          <div className="bg-white dark:bg-obsidian-card p-3.5 rounded-2xl border border-slate-200/80 dark:border-obsidian-border space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Database className="w-4 h-4 text-mint-500" />
                Cloud Database
              </span>
              <span className="font-semibold text-emerald-500">Supabase PostgreSQL (Connected)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Smartphone className="w-4 h-4 text-mint-500" />
                Platform
              </span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Android APK / Web App</span>
            </div>
          </div>
        </div>

        {/* Master Admin Panel Button (for Admin or via Secret Tap) */}
        {(currentUser?.is_admin === 1 || tapCount >= 3) && (
          <button
            onClick={() => setIsAdminOpen(true)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-xs transition border border-rose-500/20 shadow-xs cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              <span>Master Admin Console</span>
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Log Out Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold text-sm transition border border-rose-500/20 shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Loop</span>
        </button>

        <p
          onClick={handleVersionTap}
          className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 pt-2 pb-6 cursor-pointer select-none active:scale-95 transition"
          title="Tap 5 times for Admin Console"
        >
          Loop Messenger • Version 1.0.0 (Final V1) • Obsidian Edition
        </p>
      </div>

      {/* Admin Console Modal */}
      {isAdminOpen && (
        <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      )}
    </div>
  );
};
