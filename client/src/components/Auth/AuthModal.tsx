import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import { generateSeedPhrase, hashSeedPhrase } from '../../services/cryptoSeed.js';
import {
  Smartphone,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

type ScreenType = 'PHONE_INPUT' | 'OTP_INPUT' | 'SECRET_ANON' | 'RESTORE_SEED';

export const AuthModal: React.FC = () => {
  const [screen, setScreen] = useState<ScreenType>('PHONE_INPUT');

  // Phone + OTP State
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);

  // Secret Anonymous Mode State (Admin / Owner only)
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [seedWords, setSeedWords] = useState<string[]>([]);
  const [restoreWords, setRestoreWords] = useState('');
  const [copied, setCopied] = useState(false);

  // Shared status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useStore((state) => state.setAuth);

  // Secret Easter Egg / Admin access: tap logo 5 times to reveal secret anonymous engine
  const handleLogoTap = () => {
    const next = logoTapCount + 1;
    if (next >= 5) {
      setLogoTapCount(0);
      setSeedWords(generateSeedPhrase());
      setScreen('SECRET_ANON');
      setError(null);
    } else {
      setLogoTapCount(next);
    }
  };

  // 1. Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your mobile phone number');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await api.sendOtp(phone.trim());
      setReceivedOtp(data.code || null);
      setScreen('OTP_INPUT');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await api.verifyOtp({
        phone: phone.trim(),
        code: otpCode.trim(),
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
      });

      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Testing Login
  const handleQuickDemo = async (userEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(userEmail, 'password123');
      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  // Secret Anonymous Registration (Owner Only)
  const handleSecretAnonRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      const seedHash = await hashSeedPhrase(seedWords);
      const name = displayName.trim() || 'Ghost User';
      const tag = username.trim() || `@ghost_${Math.floor(100 + Math.random() * 900)}`;

      const data = await api.anonymousRegister({
        displayName: name,
        anonTag: tag,
        seedHash,
      });
      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Failed to create anonymous account');
    } finally {
      setLoading(false);
    }
  };

  // Secret Anonymous Restore
  const handleSecretRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    const words = restoreWords.trim().split(/\s+/).filter(Boolean);
    if (words.length < 12) {
      setError('Please enter all 12 recovery words');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const seedHash = await hashSeedPhrase(words);
      const data = await api.anonymousLogin(seedHash);
      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Account not found with this seed phrase');
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
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mint-500/10 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 border border-mint-500/20 mb-3 shadow-xs cursor-pointer active:scale-95 transition"
            title="Loop Messenger (Tap for secret access)"
          >
            <img src="/logo.svg" alt="Loop" className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Loop <span className="text-mint-600 dark:text-mint-400">Messenger</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Private, Secure & Realtime Messaging
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 animate-shake flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SCREEN 1: PHONE NUMBER INPUT */}
        {screen === 'PHONE_INPUT' && (
          <form onSubmit={handleSendOtp} className="space-y-4 animate-slide-up">
            <div className="text-left">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Phone Number
              </label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border rounded-xl px-3.5 py-2.5 focus-within:border-mint-500 transition">
                <Smartphone className="w-4 h-4 text-mint-500 flex-shrink-0" />
                <input
                  type="tel"
                  required
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-medium"
                />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                🔒 <strong className="text-mint-600 dark:text-mint-400">Privacy Guarantee:</strong> Your number stays 100% private. Other users will only see your custom User ID.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full py-3 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-mint-500/25 transition cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Verification Code (OTP)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-zinc-400">
                🔒 Protected by End-to-End Cryptography
              </span>
            </div>
          </form>
        )}

        {/* SCREEN 2: ENTER OTP & OPTIONAL PROFILE DETAILS */}
        {screen === 'OTP_INPUT' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-slide-up text-left">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Enter 6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={() => setScreen('PHONE_INPUT')}
                  className="text-[11px] text-mint-600 dark:text-mint-400 hover:underline"
                >
                  Edit Number
                </button>
              </div>

              <input
                type="text"
                required
                autoFocus
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-[0.4em] font-mono text-lg font-bold px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
              />

              {receivedOtp && (
                <div className="mt-2 p-2 rounded-lg bg-mint-500/10 border border-mint-500/20 text-mint-700 dark:text-mint-300 text-xs flex items-center justify-between">
                  <span>Your verification code is: <strong>{receivedOtp}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(receivedOtp)}
                    className="text-[10px] bg-mint-500 text-white px-2 py-0.5 rounded font-semibold hover:bg-mint-600 transition"
                  >
                    Auto-fill
                  </button>
                </div>
              )}
            </div>

            {/* Optional profile fields for first-time onboarding */}
            <div className="space-y-3 pt-1 border-t border-zinc-200/60 dark:border-obsidian-border">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Setup your profile name & public user ID:
              </p>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex or Jordan"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Unique User ID <span className="text-zinc-400">(How friends find you)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. @alex_loop"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScreen('PHONE_INPUT')}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="flex-1 py-2.5 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-mint-500/25 transition cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* SCREEN 3: SECRET ANONYMOUS MODE (OWNER ONLY) */}
        {screen === 'SECRET_ANON' && (
          <div className="space-y-4 animate-slide-up text-left">
            <div className="flex items-center gap-1.5 text-mint-600 dark:text-mint-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Owner Secret Anonymous Mode</span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Zero-PII 12-Word cryptographic seed engine unlocked.
            </p>

            <div className="grid grid-cols-3 gap-1.5 bg-zinc-100 dark:bg-obsidian-surface p-3 rounded-xl border border-zinc-200 dark:border-obsidian-border font-mono text-xs select-text">
              {seedWords.map((word, idx) => (
                <div key={idx} className="bg-white dark:bg-obsidian-card p-1 px-1.5 rounded flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400">{idx + 1}.</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{word}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(seedWords.join(' '));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full py-1.5 text-xs font-semibold rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-mint-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied 12 Words!' : 'Copy 12 Words'}</span>
            </button>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScreen('PHONE_INPUT')}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSecretAnonRegister}
                disabled={loading}
                className="flex-1 py-2.5 px-3 rounded-xl bg-mint-500 hover:bg-mint-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-mint-500/25 transition cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Enter Anonymously</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-obsidian-border flex items-center justify-center gap-4 text-[11px] text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-mint-500" />
            <span>End-to-End Encrypted</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Private User ID Network</span>
          </div>
        </div>
      </div>
    </div>
  );
};
