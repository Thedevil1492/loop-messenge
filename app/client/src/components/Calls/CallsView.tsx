import React from 'react';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Link2 } from 'lucide-react';

export const CallsView: React.FC = () => {
  const callLogs = [
    {
      id: '1',
      name: 'Alice Chen',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Alice%20Chen&backgroundColor=10b981&textColor=ffffff',
      type: 'AUDIO',
      direction: 'INCOMING',
      time: 'Today, 10:45 AM',
    },
    {
      id: '2',
      name: 'Bob Miller',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Bob%20Miller&backgroundColor=059669&textColor=ffffff',
      type: 'VIDEO',
      direction: 'MISSED',
      time: 'Yesterday, 8:20 PM',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-obsidian-bg select-none overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 dark:border-obsidian-border bg-white dark:bg-obsidian-card">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Calls</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Create Call Link (WhatsApp Style) */}
        <div
          onClick={() => alert('Call link copied to clipboard! Anyone with Loop can join this encrypted call.')}
          className="flex items-center gap-3.5 bg-white dark:bg-obsidian-card p-3.5 rounded-2xl border border-slate-200/80 dark:border-obsidian-border hover:bg-slate-100 dark:hover:bg-obsidian-surface cursor-pointer transition shadow-xs"
        >
          <div className="w-12 h-12 rounded-full bg-mint-500/15 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Create call link</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Share a link for your Loop encrypted call</p>
          </div>
        </div>

        {/* Recent Calls */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 px-1">
            Recent
          </h2>

          <div className="space-y-1.5">
            {callLogs.map((call) => (
              <div
                key={call.id}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-obsidian-card border border-slate-200/70 dark:border-obsidian-border transition shadow-xs"
              >
                <img src={call.avatar} alt={call.name} className="w-11 h-11 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-sm font-semibold truncate ${
                      call.direction === 'MISSED' ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {call.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {call.direction === 'INCOMING' && <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />}
                    {call.direction === 'OUTGOING' && <PhoneOutgoing className="w-3.5 h-3.5 text-blue-500" />}
                    {call.direction === 'MISSED' && <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />}
                    <span>{call.time}</span>
                  </div>
                </div>

                {/* Call Back Button */}
                <button
                  onClick={() => alert(`Starting ${call.type.toLowerCase()} call to ${call.name}...`)}
                  className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-obsidian-surface text-mint-600 dark:text-mint-400 transition"
                  title="Call"
                >
                  {call.type === 'VIDEO' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
