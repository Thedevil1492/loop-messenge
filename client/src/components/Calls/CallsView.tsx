import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore.js';
import { api } from '../../services/api.js';
import { socket } from '../../services/socket.js';
import { Avatar } from '../UI/Avatar.js';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Link2,
  Check,
  Clock,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const CallsView: React.FC = () => {
  const currentUser = useStore((state) => state.currentUser);
  const startCall = useStore((state) => state.startCall);

  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const list = await api.getCallLogs();
      setCallLogs(list);
    } catch (err) {
      console.error('Failed to load call logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  const handleCreateCallLink = () => {
    const callUrl = `https://loop-messenge.onrender.com/call?room=loop_${Date.now().toString(36)}`;
    navigator.clipboard.writeText(callUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleCallback = (call: any) => {
    const isCaller = call.caller_id === currentUser?.id;
    const contactId = isCaller ? call.receiver_id : call.caller_id;
    const contactName = isCaller ? call.receiver_name : call.caller_name;
    const contactAvatar = isCaller ? call.receiver_avatar : call.caller_avatar;
    const callType = call.type || 'AUDIO';

    startCall({
      contactId,
      contactName,
      contactAvatar,
      callType,
      chatId: call.chat_id,
    });

    socket.send('call:initiate', {
      toUserId: contactId,
      callType,
      callerName: currentUser?.display_name || 'Contact',
      callerAvatar: currentUser?.avatar_url || '',
      chatId: call.chat_id,
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-obsidian-bg select-none overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-obsidian-border bg-white dark:bg-obsidian-card">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Calls</h1>
      </div>

      <div className="p-4 space-y-6 max-w-xl">
        {/* Create Call Link Card */}
        <div
          onClick={handleCreateCallLink}
          className="flex items-center gap-3.5 bg-white dark:bg-obsidian-card p-3.5 rounded-2xl border border-zinc-200/80 dark:border-obsidian-border hover:bg-zinc-50 dark:hover:bg-obsidian-surface cursor-pointer transition shadow-xs"
        >
          <div className="w-12 h-12 rounded-full bg-mint-500/15 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 flex items-center justify-center flex-shrink-0">
            {linkCopied ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5 stroke-[2.5]" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {linkCopied ? 'Link Copied to Clipboard!' : 'Create call link'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {linkCopied
                ? 'Share link with anyone to start an encrypted call'
                : 'Share a link for your Loop encrypted call'}
            </p>
          </div>
        </div>

        {/* Recent Calls */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 px-1">
            Recent calls ({callLogs.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center p-8 text-zinc-400">
              <span className="w-5 h-5 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : callLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500 bg-white dark:bg-obsidian-card rounded-2xl border border-zinc-200/80 dark:border-obsidian-border">
              <Phone className="w-6 h-6 mx-auto mb-2 text-zinc-400/80" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">No call history</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Start an audio or video call directly from any chat.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {callLogs.map((call) => {
                const isCaller = call.caller_id === currentUser?.id;
                const contactName = isCaller ? call.receiver_name : call.caller_name;
                const contactAvatar = isCaller ? call.receiver_avatar : call.caller_avatar;
                const isMissed = call.status === 'MISSED' || call.status === 'DECLINED';

                return (
                  <div
                    key={call.id}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-obsidian-card border border-zinc-200/70 dark:border-obsidian-border transition shadow-xs"
                  >
                    <Avatar src={contactAvatar} name={contactName || 'User'} size="md" />

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          isMissed ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {contactName || 'User'}
                      </h4>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {isMissed ? (
                          <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
                        ) : isCaller ? (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-mint-500" />
                        ) : (
                          <PhoneIncoming className="w-3.5 h-3.5 text-sky-500" />
                        )}
                        <span className="text-[11px]">
                          {formatDistanceToNow(new Date(Number(call.created_at)), { addSuffix: true })}
                        </span>
                        {call.duration > 0 && (
                          <span className="text-[10px] text-zinc-400">
                            • {Math.floor(call.duration / 60)}m {call.duration % 60}s
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCallback(call)}
                      className="p-2 rounded-xl text-mint-600 dark:text-mint-400 hover:bg-zinc-100 dark:hover:bg-obsidian-surface transition cursor-pointer"
                      title={`Call ${contactName}`}
                    >
                      {call.type === 'VIDEO' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
