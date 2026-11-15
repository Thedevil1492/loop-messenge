import React, { useState, useEffect, useRef } from 'react';
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
  MoreVertical,
  Activity,
  Terminal,
  Radio,
  Clock,
  Phone,
  Send,
  AlertTriangle,
  Megaphone,
  Check,
  ChevronRight,
  Database,
  Cpu,
} from 'lucide-react';
import type { User } from '../../types.js';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'MONITOR' | 'USERS' | 'TERMINAL';

interface TelemetryData {
  server: {
    uptimeSeconds: number;
    memoryRssMB: number;
    memoryHeapMB: number;
    nodeVersion: string;
    dbEngine: string;
  };
  counts: {
    totalUsers: number;
    onlineUsers: number;
    totalChats: number;
    totalMessages: number;
    totalCalls: number;
    activeStories: number;
  };
  activity: {
    recentMessages: Array<{ id: string; sender_name: string; content: string; created_at: number; type: string }>;
    recentCalls: Array<{ id: string; caller_name: string; receiver_name: string; type: string; status: string; created_at: number }>;
    recentRegistrations: Array<{ id: string; display_name: string; username: string | null; created_at: number }>;
  };
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Active module tab
  const [activeTab, setActiveTab] = useState<AdminTab>('MONITOR');
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);

  // Telemetry & Monitor State
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);

  // User Management State
  const [userList, setUserList] = useState<User[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  // Global Announcement Broadcast Modal/Prompt
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  // AI Agent Terminal State
  const [terminalHistory, setTerminalHistory] = useState<Array<{ command: string; output: string; time: string }>>([
    {
      command: 'system-init',
      output: 'Loop OS v1.0.0 [Production Core Online]\nType "help" to view executive operations or "agent <task>" to instruct AI Copilot.',
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

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
      await loadAllAdminData(passcode);
    } catch (err: any) {
      setError(err.message || 'Incorrect passcode');
    } finally {
      setLoading(false);
    }
  };

  const loadAllAdminData = async (secret?: string) => {
    const key = secret || sessionStorage.getItem('loop_admin_secret') || passcode;
    if (!key) return;

    setLoading(true);
    try {
      // 1. Telemetry & Live Activity
      const telemRes = await fetch(`${BASE_URL}/api/admin/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
      });
      const telemData = await telemRes.json();
      if (telemData.telemetry) setTelemetry(telemData.telemetry);

      // 2. User list
      const usersRes = await fetch(`${BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
      });
      const usersData = await usersRes.json();
      if (usersData.users) setUserList(usersData.users);
    } catch (err: any) {
      console.error('Admin telemetry fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run terminal command
  const handleExecuteCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    const key = sessionStorage.getItem('loop_admin_secret') || passcode;

    if (cmd.toLowerCase() === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/admin/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();

      setTerminalHistory((prev) => [
        ...prev,
        {
          command: cmd,
          output: data.output || data.error || 'Executed.',
          time: new Date().toLocaleTimeString(),
        },
      ]);
      setTerminalInput('');

      // Refresh monitor if mutation commands occurred
      if (['broadcast', 'wipe-user', 'reset-pass', 'purge-stories'].some((k) => cmd.startsWith(k))) {
        await loadAllAdminData();
      }
    } catch (err: any) {
      setTerminalHistory((prev) => [
        ...prev,
        {
          command: cmd,
          output: `Error executing command: ${err.message}`,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    const key = sessionStorage.getItem('loop_admin_secret') || passcode;
    setBroadcasting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
        body: JSON.stringify({ message: broadcastMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Broadcast failed');

      alert(`Broadcast sent to ${data.sentToChats} active chats!`);
      setBroadcastMessage('');
      setShowBroadcastModal(false);
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to send broadcast');
    } finally {
      setBroadcasting(false);
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
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      setUserList((prev) => prev.filter((u) => u.id !== userId));
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleResetPassword = async (userId: string, username: string) => {
    const newPass = prompt(`Enter new password for @${username} (minimum 6 characters):`);
    if (!newPass || newPass.trim().length < 6) return;

    const key = sessionStorage.getItem('loop_admin_secret') || passcode;
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
        body: JSON.stringify({ userId, newPassword: newPass.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');

      alert(`Password for @${username} reset successfully!`);
    } catch (err: any) {
      alert(err.message || 'Reset failed');
    }
  };

  const handleLoginAsUser = async (userId: string) => {
    const key = sessionStorage.getItem('loop_admin_secret') || passcode;
    try {
      const res = await fetch(`${BASE_URL}/api/admin/login-as`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
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
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
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
      await loadAllAdminData();
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

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 select-none animate-fade-in font-sans">
      <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden relative">
        {/* TOP COMMAND HEADER WITH 3 DOTS MENU */}
        <div className="p-4 px-5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold tracking-wider uppercase text-zinc-100">
                  Loop Core Admin Control
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Executive telemetrics, user moderation & AI copilot terminal</p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {isUnlocked && (
              <>
                {/* 3 DOTS MENU BUTTON */}
                <button
                  type="button"
                  onClick={() => setShowThreeDotsMenu(!showThreeDotsMenu)}
                  className="p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Command Actions (3 Dots)"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* 3 DOTS DROPDOWN MENU */}
                {showThreeDotsMenu && (
                  <div className="absolute top-11 right-8 w-56 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowThreeDotsMenu(false);
                        setShowBroadcastModal(true);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-zinc-800 flex items-center gap-2 text-zinc-200 transition"
                    >
                      <Megaphone className="w-4 h-4 text-amber-400" />
                      <span>Send Broadcast Announcement</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowThreeDotsMenu(false);
                        loadAllAdminData();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-zinc-800 flex items-center gap-2 text-zinc-200 transition"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      <span>Refresh Telemetrics</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setShowThreeDotsMenu(false);
                        const key = sessionStorage.getItem('loop_admin_secret') || passcode;
                        await fetch(`${BASE_URL}/api/admin/command`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-admin-secret': key },
                          body: JSON.stringify({ command: 'purge-stories' }),
                        });
                        alert('Expired 24h stories purged successfully!');
                        await loadAllAdminData();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-zinc-800 flex items-center gap-2 text-zinc-200 transition"
                    >
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span>Purge Expired 24h Stories</span>
                    </button>

                    <div className="border-t border-zinc-800 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowThreeDotsMenu(false);
                        setIsUnlocked(false);
                        sessionStorage.removeItem('loop_admin_secret');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-rose-950/40 text-rose-400 flex items-center gap-2 transition"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Lock Admin Console</span>
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCREEN 1: PASSCODE LOCK */}
        {!isUnlocked ? (
          <div className="my-auto p-8 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Restricted Executive Access
            </h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Enter your master authorization passcode to unlock live system metrics, account controls, and AI terminal.
            </p>

            {error && (
              <div className="w-full p-3 mb-4 text-xs rounded-xl bg-rose-950/40 text-rose-400 border border-rose-900/60 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPasscode} className="w-full space-y-3.5">
              <input
                type="password"
                required
                autoFocus
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter Master Passcode..."
                className="w-full px-4 py-3 text-center tracking-[0.25em] text-sm rounded-xl border border-zinc-800 bg-zinc-900/80 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />

              <button
                type="submit"
                disabled={loading || !passcode}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Unlock Executive Console'}
              </button>
            </form>
          </div>
        ) : (
          /* SCREEN 2: UNLOCKED CONSOLE WITH 3 TABS */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 3 Main Tab Nav Bar */}
            <div className="flex items-center px-4 pt-3 border-b border-zinc-800/80 bg-zinc-900/40 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('MONITOR')}
                className={`py-2 px-4 rounded-t-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border-b-2 ${
                  activeTab === 'MONITOR'
                    ? 'border-emerald-500 text-emerald-400 bg-zinc-900/80'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>1. Live Monitor & Feed</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('USERS')}
                className={`py-2 px-4 rounded-t-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border-b-2 ${
                  activeTab === 'USERS'
                    ? 'border-emerald-500 text-emerald-400 bg-zinc-900/80'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>2. Users & Accounts</span>
                <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">
                  {userList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('TERMINAL')}
                className={`py-2 px-4 rounded-t-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border-b-2 ${
                  activeTab === 'TERMINAL'
                    ? 'border-emerald-500 text-emerald-400 bg-zinc-900/80'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                }`}
              >
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400">3. AI Agent Terminal</span>
              </button>
            </div>

            {/* TAB CONTENT PANELS */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
              {/* TAB 1: LIVE MONITOR & RECENT ACTIVITY */}
              {activeTab === 'MONITOR' && telemetry && (
                <div className="space-y-5 animate-fade-in">
                  {/* Real-time KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                      <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                        <span>Active Online</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-2xl font-black text-emerald-400">
                        {telemetry.counts.onlineUsers} <span className="text-xs text-zinc-500 font-normal">/ {telemetry.counts.totalUsers}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Live Connected Presence</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                      <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                        <span>Total Messages</span>
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <p className="text-2xl font-black text-white">
                        {telemetry.counts.totalMessages}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Across {telemetry.counts.totalChats} chats</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                      <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                        <span>Encrypted Calls</span>
                        <Phone className="w-3.5 h-3.5 text-mint-400" />
                      </div>
                      <p className="text-2xl font-black text-mint-400">
                        {telemetry.counts.totalCalls}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Audio & Video Sessions</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                      <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                        <span>Server Uptime</span>
                        <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <p className="text-lg font-black text-amber-400 mt-1">
                        {formatUptime(telemetry.server.uptimeSeconds)}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {telemetry.server.memoryRssMB}MB RAM • Node {telemetry.server.nodeVersion}
                      </p>
                    </div>
                  </div>

                  {/* Infrastructure Telemetrics Banner */}
                  <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>Database Engine: <strong className="text-zinc-200">{telemetry.server.dbEngine}</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Stories Active: <strong className="text-zinc-200">{telemetry.counts.activeStories}</strong></span>
                      <button
                        type="button"
                        onClick={() => loadAllAdminData()}
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Activity Feeds: Messages, Calls, Registrations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Recent Message Traffic */}
                    <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-400" />
                          <span>Recent Message Traffic</span>
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-mono">Last 10 msgs</span>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {telemetry.activity.recentMessages.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-4">No recent messages</p>
                        ) : (
                          telemetry.activity.recentMessages.map((m) => (
                            <div key={m.id} className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/60 text-xs">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-bold text-zinc-300">{m.sender_name}</span>
                                <span className="text-zinc-500 font-mono text-[10px]">
                                  {new Date(m.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-zinc-400 truncate text-[11px] font-mono">
                                {m.content || `[${m.type} Attachment]`}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Recent Calls & Sessions */}
                    <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-mint-400" />
                          <span>Recent Call Logs</span>
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-mono">Real-time WebRTC</span>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {telemetry.activity.recentCalls.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-4">No call records yet</p>
                        ) : (
                          telemetry.activity.recentCalls.map((c) => (
                            <div key={c.id} className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/60 text-xs flex items-center justify-between">
                              <div>
                                <p className="font-bold text-zinc-300 text-xs">
                                  {c.caller_name} <span className="text-zinc-500 font-normal">→</span> {c.receiver_name}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  {c.type} • {c.status}
                                </p>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {new Date(c.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USER DIRECTORY & MODERATION */}
              {activeTab === 'USERS' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search accounts by name or @username..."
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />

                    <button
                      type="button"
                      onClick={() => setShowCreateForm(!showCreateForm)}
                      className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{showCreateForm ? 'Close Form' : '+ Add Account'}</span>
                    </button>
                  </div>

                  {/* Create Account Form */}
                  {showCreateForm && (
                    <form onSubmit={handleCreateUser} className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 animate-slide-up">
                      <h4 className="text-xs font-bold text-white">Direct Account Creator</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          value={newDisplayName}
                          onChange={(e) => setNewDisplayName(e.target.value)}
                          placeholder="Display Name (e.g. Master Admin)"
                          className="px-3 py-2 text-xs rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="Unique @username (e.g. admin)"
                          className="px-3 py-2 text-xs rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Password (min 6 chars)"
                          className="px-3 py-2 text-xs rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="Email (Optional)"
                          className="px-3 py-2 text-xs rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 text-xs text-zinc-300 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newIsAdmin}
                            onChange={(e) => setNewIsAdmin(e.target.checked)}
                            className="rounded text-emerald-500 focus:ring-emerald-500"
                          />
                          <span>Stealth Admin (Hidden in search until you message someone)</span>
                        </label>

                        <button
                          type="submit"
                          disabled={creating}
                          className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                        >
                          {creating ? 'Creating...' : 'Create Account'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Registered Users Roster */}
                  <div className="space-y-2">
                    {filteredUsers.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-900/50 rounded-2xl">
                        No accounts match your query
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between hover:border-zinc-700 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar src={u.avatar_url} name={u.display_name} isOnline={!!u.is_online} size="md" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-white truncate">{u.display_name}</p>
                                {u.is_admin === 1 && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-emerald-400 font-medium truncate">
                                @{u.username || u.anon_tag || 'user'}
                                {u.email && <span className="text-zinc-500 ml-1.5 font-normal">({u.email})</span>}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleLoginAsUser(u.id)}
                              className="p-1.5 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Login As This User"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Login As</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResetPassword(u.id, u.username || u.display_name)}
                              className="p-1.5 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Reset Pass</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.display_name)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
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

              {/* TAB 3: AI AGENT TERMINAL / COMMAND SPACE */}
              {activeTab === 'TERMINAL' && (
                <div className="h-full flex flex-col space-y-3 font-mono animate-fade-in">
                  <div className="p-2.5 px-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span>Executive Command Line & AI Copilot Hub</span>
                    </span>
                    <span className="text-[10px] text-cyan-500">Connected to Loop Core</span>
                  </div>

                  {/* Terminal Screen View */}
                  <div className="flex-1 min-h-[300px] p-4 rounded-2xl bg-black border border-zinc-800 text-xs overflow-y-auto space-y-3">
                    {terminalHistory.map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
                          <span className="text-emerald-400 font-bold">root@loop-core:~$</span>
                          <span className="text-white font-semibold">{item.command}</span>
                          <span className="ml-auto text-[10px] opacity-60">{item.time}</span>
                        </div>
                        <pre className="text-zinc-300 whitespace-pre-wrap font-mono pl-4 border-l border-zinc-800 text-[11px] leading-relaxed">
                          {item.output}
                        </pre>
                      </div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>

                  {/* Quick Action Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto py-1 text-[11px]">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold">Quick:</span>
                    {['help', 'stats', 'users', 'purge-stories', 'agent '].map((cmd) => (
                      <button
                        key={cmd}
                        type="button"
                        onClick={() => setTerminalInput(cmd)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-mono transition cursor-pointer"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>

                  {/* Terminal Input Box */}
                  <form onSubmit={handleExecuteCommand} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-cyan-500 transition">
                      <span className="text-cyan-400 font-bold text-xs">$</span>
                      <input
                        type="text"
                        autoFocus
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        placeholder="Type command (e.g. stats, broadcast <msg>, agent <task>)..."
                        className="w-full bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!terminalInput.trim()}
                      className="p-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Run</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BROADCAST MODAL POPUP */}
        {showBroadcastModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Megaphone className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-white">Broadcast Global Announcement</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                This will instantly inject a system announcement message into every active chat on the server.
              </p>

              <form onSubmit={handleSendBroadcast} className="space-y-3">
                <textarea
                  rows={3}
                  required
                  autoFocus
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="e.g. Scheduled maintenance at 12:00 AM UTC..."
                  className="w-full p-3 rounded-xl bg-black border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none font-mono"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcasting || !broadcastMessage.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    {broadcasting ? 'Sending...' : 'Broadcast Now'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
