import React, { useState } from 'react';
import { api, BASE_URL } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import { AdminModal } from '../Admin/AdminModal.js';
import {
  Lock,
  User,
  AtSign,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  LogIn,
  UserPlus,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');

  // Logo tap secret counter & long-press for Admin Panel
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useStore((state) => state.setAuth);
  const longPressTimerRef = React.useRef<any>(null);

  const startSecretPress = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsAdminOpen(true);
      setError(null);
    }, 2000); // 2 seconds hold secretly opens Admin Console
  };

  const endSecretPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Secret Admin Access: Tap logo 5 times to unlock Master Admin Console
  const handleLogoTap = () => {
    const next = logoTapCount + 1;
    if (next >= 5) {
      setLogoTapCount(0);
      setIsAdminOpen(true);
      setError(null);
    } else {
      setLogoTapCount(next);
    }
  };

  // 1. Handle Login (by @username or email)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError('Please enter your username/email and password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.login(loginIdentifier.trim(), loginPassword.trim());
      setAuth(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Signup (Display Name, Unique @username, Password)
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupDisplayName.trim() || !signupUsername.trim() || !signupPassword.trim()) {
      setError('Please fill all required fields');
      return;
    }

    const cleanUsername = signupUsername.trim().toLowerCase().replace(/^@/, '');
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL || ''}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: signupDisplayName.trim(),
          username: cleanUsername,
          password: signupPassword.trim(),
          email: signupEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-obsidian-card border border-zinc-200 dark:border-obsidian-border rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden transition-all">
        {/* App Logo & Header */}
        <div className="text-center mb-6">
          <div
            onClick={handleLogoTap}
            onMouseDown={startSecretPress}
            onMouseUp={endSecretPress}
            onTouchStart={startSecretPress}
            onTouchEnd={endSecretPress}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mint-500/10 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 border border-mint-500/20 mb-3 shadow-xs cursor-pointer active:scale-95 transition select-none"
            title="Loop Messenger"
          >
            <img src="/logo.svg" alt="Loop" className="w-8 h-8 pointer-events-none" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Loop <span className="text-mint-600 dark:text-mint-400">Messenger</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Fast, Private & End-to-End Encrypted
          </p>
        </div>

        {/* Tab Switcher: Login vs Create Account */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-obsidian-surface rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'LOGIN'
                ? 'bg-white dark:bg-obsidian-card text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('SIGNUP');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'SIGNUP'
                ? 'bg-white dark:bg-obsidian-card text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 animate-shake flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: LOGIN FORM */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-slide-up text-left">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Username or Email
              </label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-xl px-3.5 py-2.5 focus-within:border-mint-500 transition">
                <AtSign className="w-4 h-4 text-mint-500 flex-shrink-0" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. alex or alex@loop.id"
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-xl px-3.5 py-2.5 focus-within:border-mint-500 transition">
                <KeyRound className="w-4 h-4 text-mint-500 flex-shrink-0" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password..."
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !loginIdentifier || !loginPassword}
              className="w-full py-3 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-mint-500/25 transition cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Loop</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: SIGNUP FORM */}
        {mode === 'SIGNUP' && (
          <form onSubmit={handleSignup} className="space-y-3.5 animate-slide-up text-left">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Your Display Name
              </label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-xl px-3.5 py-2.5 focus-within:border-mint-500 transition">
                <User className="w-4 h-4 text-mint-500 flex-shrink-0" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={signupDisplayName}
                  onChange={(e) => setSignupDisplayName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Unique User ID (@username)
                </label>
                <span className="text-[10px] text-mint-600 dark:text-mint-400 font-semibold">
                  Unique Loop ID
                </span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-xl px-3.5 py-2.5 focus-within:border-mint-500 transition">
                <AtSign className="w-4 h-4 text-mint-500 flex-shrink-0" />
                <input
                  type="text"
                  required
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="e.g. alex_01"
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-medium"
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Friends will add you using this username.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-xl px-3.5 py-2.5 focus-within:border-mint-500 transition">
                <KeyRound className="w-4 h-4 text-mint-500 flex-shrink-0" />
                <input
                  type="password"
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 6 characters..."
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-xl px-3.5 py-2.5 focus-within:border-mint-500 transition">
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@example.com (Optional)"
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !signupDisplayName || !signupUsername || !signupPassword}
              className="w-full py-3 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-mint-500/25 transition cursor-pointer mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Footer */}
        <div className="pt-4 mt-2 border-t border-zinc-100 dark:border-obsidian-border text-center flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <Lock className="w-3.5 h-3.5 text-mint-500" />
          <span>Zero-Knowledge End-to-End Encryption</span>
        </div>
      </div>

      {/* Secret Master Admin Console Modal */}
      {isAdminOpen && (
        <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      )}
    </div>
  );
};
