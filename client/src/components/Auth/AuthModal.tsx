import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import { generateSeedPhrase, hashSeedPhrase, deriveDefaultAnonTag } from '../../services/cryptoSeed.js';
import {
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  UserCheck,
  AlertTriangle,
  Flame,
} from 'lucide-react';

type AuthScreen = 'WELCOME' | 'CREATE_NAME' | 'CREATE_SEED' | 'RESTORE_SEED' | 'LEGACY';

export const AuthModal: React.FC = () => {
  const [screen, setScreen] = useState<AuthScreen>('WELCOME');

  // Anonymous identity creation state
  const [displayName, setDisplayName] = useState('');
  const [anonTag, setAnonTag] = useState('');
  const [seedWords, setSeedWords] = useState<string[]>([]);
  const [confirmedBackup, setConfirmedBackup] = useState(false);
  const [copied, setCopied] = useState(false);

  // Restore state
  const [restorePhrase, setRestorePhrase] = useState('');

  // Legacy Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterLegacy, setIsRegisterLegacy] = useState(false);

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setAuth = useStore((state) => state.setAuth);

  // Start creation of Anonymous Identity
  const handleStartAnonCreation = () => {
    setError(null);
    const words = generateSeedPhrase();
    setSeedWords(words);
    setConfirmedBackup(false);
    setScreen('CREATE_NAME');
  };

  // Move from name step to seed phrase review
  const handleProceedToSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please provide a display name or handle');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const hash = await hashSeedPhrase(seedWords);
      const tag = anonTag.trim() || deriveDefaultAnonTag(displayName, hash);
      setAnonTag(tag);
      setScreen('CREATE_SEED');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize keys');
    } finally {
      setLoading(false);
    }
  };

  // Finalize anonymous registration
  const handleFinishAnonRegister = async () => {
    if (!confirmedBackup) {
      setError('Please confirm you have backed up your 12 recovery words');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const seedHash = await hashSeedPhrase(seedWords);
      const data = await api.anonymousRegister({
        displayName: displayName.trim(),
        anonTag: anonTag.trim(),
        seedHash,
      });

      // Save user & token in store and localStorage
      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Restore account via 12 words
  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = restorePhrase.trim();
    const words = clean.split(/\s+/).filter(Boolean);

    if (words.length < 12) {
      setError(`Please enter all 12 words (currently entered: ${words.length})`);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const seedHash = await hashSeedPhrase(words);
      const data = await api.anonymousLogin(seedHash);
      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Invalid 12-word seed phrase or account not found');
    } finally {
      setLoading(false);
    }
  };

  // Copy seed words
  const handleCopySeed = () => {
    const text = seedWords.join(' ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Quick Demo Login
  const handleQuickLogin = async (userEmail: string) => {
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

  // Legacy Email submit
  const handleLegacySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegisterLegacy) {
        const data = await api.register(email, password, displayName || 'User');
        setAuth(data.user, data.token);
      } else {
        const data = await api.login(email, password);
        setAuth(data.user, data.token);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-obsidian-card border border-zinc-200 dark:border-obsidian-border rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden transition-all">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-mint-500/10 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 border border-mint-500/20 mb-3 shadow-xs">
            <img src="/logo.svg" alt="Loop" className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Loop <span className="text-mint-600 dark:text-mint-400">Messenger</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Zero Phone Numbers. Zero Emails. 100% Private.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 animate-shake flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SCREEN 1: WELCOME */}
        {screen === 'WELCOME' && (
          <div className="space-y-3.5">
            <button
              onClick={handleStartAnonCreation}
              className="w-full py-3.5 px-4 rounded-2xl bg-mint-500 hover:bg-mint-600 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-mint-500/25 active:scale-[0.99] transition cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Create Anonymous Identity</span>
            </button>

            <button
              onClick={() => {
                setError(null);
                setScreen('RESTORE_SEED');
              }}
              className="w-full py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-obsidian-surface dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-obsidian-border font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-mint-500" />
              <span>Restore with 12-Word Seed Phrase</span>
            </button>

            {/* Quick Demo Accounts */}
            <div className="pt-3 border-t border-zinc-200/60 dark:border-obsidian-border">
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 text-center mb-2">
                Developer / Instant Testing
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('alice@loop.app')}
                  disabled={loading}
                  className="py-2 px-3 text-xs font-medium rounded-xl bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border hover:border-mint-500 text-zinc-800 dark:text-zinc-200 transition"
                >
                  👩 Demo: Alice
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('bob@loop.app')}
                  disabled={loading}
                  className="py-2 px-3 text-xs font-medium rounded-xl bg-zinc-50 dark:bg-obsidian-surface border border-zinc-200 dark:border-obsidian-border hover:border-mint-500 text-zinc-800 dark:text-zinc-200 transition"
                >
                  👨 Demo: Bob
                </button>
              </div>
            </div>

            <div className="text-center pt-1">
              <button
                onClick={() => {
                  setError(null);
                  setScreen('LEGACY');
                }}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline transition"
              >
                Use Legacy Email / Password
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: CHOOSE DISPLAY NAME & ANON TAG */}
        {screen === 'CREATE_NAME' && (
          <form onSubmit={handleProceedToSeed} className="space-y-4 animate-slide-up">
            <div className="text-left">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Choose your Persona Name
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                This is what your contacts will see. You can change it anytime.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Ayush or Shadow Falcon"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Anonymous Tag <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                type="text"
                value={anonTag}
                onChange={(e) => setAnonTag(e.target.value)}
                placeholder="@ayush_42"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                People can add you using this tag without knowing your number or email.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScreen('WELCOME')}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-mint-500/25 transition"
              >
                <span>Continue to 12-Word Seed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* SCREEN 3: REVIEW 12-WORD SEED PHRASE */}
        {screen === 'CREATE_SEED' && (
          <div className="space-y-4 animate-slide-up text-left">
            <div>
              <div className="flex items-center gap-1.5 text-mint-600 dark:text-mint-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Your Master Key</span>
              </div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                12-Word Recovery Seed Phrase
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Loop stores no password or phone number. These 12 words are the ONLY way to recover your account if you change devices.
              </p>
            </div>

            {/* 12 Words Grid */}
            <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-obsidian-surface p-3.5 rounded-2xl border border-zinc-200 dark:border-obsidian-border font-mono text-xs select-text">
              {seedWords.map((word, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-obsidian-card border border-zinc-200/80 dark:border-obsidian-border rounded-lg p-1.5 px-2 flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="text-[10px] text-zinc-400 w-3.5 text-right font-sans">
                    {idx + 1}.
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{word}</span>
                </div>
              ))}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopySeed}
              type="button"
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-zinc-200/70 hover:bg-zinc-200 dark:bg-obsidian-surface dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-2 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-mint-500" />
                  <span className="text-mint-600 dark:text-mint-400">12 Words Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All 12 Words</span>
                </>
              )}
            </button>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={confirmedBackup}
                onChange={(e) => setConfirmedBackup(e.target.checked)}
                className="mt-0.5 rounded text-mint-500 focus:ring-mint-500 w-4 h-4 cursor-pointer"
              />
              <span>
                I have written down or safely saved these 12 words. I understand that without them, my account cannot be recovered.
              </span>
            </label>

            {/* Final Submit */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScreen('CREATE_NAME')}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinishAnonRegister}
                disabled={loading || !confirmedBackup}
                className="flex-1 py-3 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-mint-500/25 transition cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter Loop Messenger</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 4: RESTORE VIA 12-WORD SEED */}
        {screen === 'RESTORE_SEED' && (
          <form onSubmit={handleRestore} className="space-y-4 animate-slide-up text-left">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Restore with 12-Word Seed
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Paste or type the 12 words you saved when creating your identity.
              </p>
            </div>

            <div>
              <textarea
                rows={3}
                required
                autoFocus
                value={restorePhrase}
                onChange={(e) => setRestorePhrase(e.target.value)}
                placeholder="e.g. echo falcon light river canyon shadow beacon..."
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500 leading-relaxed resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setScreen('WELCOME')}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !restorePhrase.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-mint-500/25 transition cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Restore Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* SCREEN 5: LEGACY EMAIL / PASSWORD */}
        {screen === 'LEGACY' && (
          <form onSubmit={handleLegacySubmit} className="space-y-3.5 text-left animate-slide-up">
            <div className="flex rounded-xl bg-zinc-100 dark:bg-obsidian-surface p-1 mb-2">
              <button
                type="button"
                onClick={() => setIsRegisterLegacy(false)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  !isRegisterLegacy
                    ? 'bg-white dark:bg-obsidian-card text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsRegisterLegacy(true)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  isRegisterLegacy
                    ? 'bg-white dark:bg-obsidian-card text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {isRegisterLegacy && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Drake"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-obsidian-border bg-zinc-50 dark:bg-obsidian-surface text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-mint-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScreen('WELCOME')}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 text-xs font-semibold text-white rounded-xl bg-mint-500 hover:bg-mint-600 shadow-md shadow-mint-500/25 transition flex items-center justify-center cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isRegisterLegacy ? (
                  'Create with Email'
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-obsidian-border flex items-center justify-center gap-4 text-[11px] text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-mint-500" />
            <span>Zero Data Collection</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Anti-SIM Swap</span>
          </div>
        </div>
      </div>
    </div>
  );
};
